import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type ResponseSchema,
} from '@google/generative-ai';
import sharp = require('sharp');
import type { MealImageLocale } from './dto/analyze-meal-image.dto';

/** Etiket taraması (`gemini-vision.service`) ile aynı varsayılan — tek `GEMINI_MODEL` ile uyumlu. */
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

function resolvedModel(): string {
  const m = (process.env.GEMINI_MODEL ?? DEFAULT_MODEL).trim();
  return m.length > 0 ? m : DEFAULT_MODEL;
}

const SYSTEM_TR = `
Sen bir beslenme asistanısın. Kullanıcı bir yemek veya atıştırmalık fotoğrafı gönderiyor.

Görev:
1) Görselde ne olduğunu kısa ve net anlat (1–3 paragraf veya madde işaretli liste olabilir): tahmini yemek türü, görünür malzemeler, pişirme/sunum.
2) Tek tipik porsiyon için tahmini ortalama besin değerleri ver (kalori, protein, karbonhidrat, yağ). Net bilgi yoksa makul bir aralık ortası kullan; tıbbi iddia verme.
3) shortTitle: günlüğe kayıt için kısa yemek adı (en fazla ~60 karakter).

Çıktı dili: Türkçe (description ve shortTitle Türkçe).

Yanıt yalnızca şemadaki JSON olmalı; markdown veya kod bloğu kullanma.
`.trim();

const SYSTEM_EN = `
You are a nutrition assistant. The user sends a photo of a meal or snack.

Tasks:
1) Describe clearly what you see (1–3 short paragraphs or bullet lines): dish type, visible ingredients, cooking/presentation if apparent.
2) Give estimated average nutrition for one typical portion (calories, protein, carbs, fat). If uncertain, use a reasonable mid-range estimate; do not claim medical precision.
3) shortTitle: a short dish name for logging (~60 characters max).

Output language: English for description and shortTitle.

Return only JSON matching the schema; no markdown or code fences.
`.trim();

const USER_TR = 'Bu yemek fotoğrafını incele ve şemaya uygun JSON döndür.';
const USER_EN = 'Analyze this meal photo and return JSON matching the schema.';

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    description: {
      type: SchemaType.STRING,
      description: 'Yemek tanımı / meal description in requested language',
    },
    shortTitle: {
      type: SchemaType.STRING,
      description: 'Short dish title for meal log',
    },
    nutrition: {
      type: SchemaType.OBJECT,
      properties: {
        calories: {
          type: SchemaType.NUMBER,
          description: 'Estimated kcal for one typical portion',
        },
        protein: { type: SchemaType.NUMBER, description: 'Protein grams' },
        carbs: { type: SchemaType.NUMBER, description: 'Carbohydrate grams' },
        fat: { type: SchemaType.NUMBER, description: 'Fat grams' },
      },
      required: ['calories', 'protein', 'carbs', 'fat'],
    },
  },
  required: ['description', 'shortTitle', 'nutrition'],
} satisfies ResponseSchema;

export type MealImageNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function clampNum(v: unknown, roundCalories = false): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return roundCalories ? Math.round(n) : Math.round(n * 10) / 10;
}

function normalizeNutrition(raw: unknown): MealImageNutrition {
  if (!raw || typeof raw !== 'object') {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  const o = raw as Record<string, unknown>;
  return {
    calories: clampNum(o.calories, true),
    protein: clampNum(o.protein),
    carbs: clampNum(o.carbs),
    fat: clampNum(o.fat),
  };
}

function detectMime(b64: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const header = Buffer.from(b64.slice(0, 12), 'base64');
  if (header[0] === 0x89 && header[1] === 0x50) return 'image/png';
  if (header[0] === 0xff && header[1] === 0xd8) return 'image/jpeg';
  if (header[0] === 0x52 && header[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

/** Sharp’ın decode edemediği (ör. HEIC) ham dosyada doğru MIME — JPEG sanıp göndermek Gemini’de 400 üretir. */
function mimeFromRawBuffer(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49) return 'image/webp';
  if (buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('ascii');
    if (/heic|heix|hevc|hevx|mif1|msf1/.test(brand)) return 'image/heic';
  }
  return 'image/jpeg';
}

@Injectable()
export class GeminiMealImageService {
  private readonly logger = new Logger(GeminiMealImageService.name);
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      this.client = new GoogleGenerativeAI(key);
      this.logger.log(`Gemini meal image hazır (model=${resolvedModel()})`);
    } else {
      this.logger.warn('GEMINI_API_KEY yok — öğün görsel analizi kapalı');
    }
  }

  async describeMealImage(
    imageBase64: string,
    locale: MealImageLocale = 'tr',
  ): Promise<{
    description: string;
    shortTitle: string;
    nutrition: MealImageNutrition;
  }> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Görsel analiz için GEMINI_API_KEY backend .env içinde tanımlı olmalı.',
      );
    }

    const normalized = imageBase64
      .replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
      .replace(/\s/g, '');

    if (!normalized || normalized.length < 20) {
      throw new BadRequestException('Geçersiz görüntü verisi.');
    }

    const inputBuf = Buffer.from(normalized, 'base64');
    const maxEdge = Math.min(
      2048,
      Math.max(512, parseInt(process.env.GEMINI_IMAGE_MAX_EDGE ?? '1024', 10) || 1024),
    );
    const jpegQ = Math.min(
      95,
      Math.max(60, parseInt(process.env.GEMINI_JPEG_QUALITY ?? '78', 10) || 78),
    );

    let payloadB64: string;
    let payloadMime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';
    try {
      const shrunk = await sharp(inputBuf)
        .rotate()
        .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: jpegQ })
        .toBuffer();
      payloadB64 = shrunk.toString('base64');
      payloadMime = 'image/jpeg';
      this.logger.log(
        `Öğün görseli küçültüldü: ${inputBuf.length} → ${shrunk.length} bytes`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Sharp başarısız, ham görüntü: ${msg}`);
      payloadB64 = normalized;
      payloadMime = mimeFromRawBuffer(inputBuf);
    }

    const modelId = resolvedModel();
    const systemInstruction = locale === 'en' ? SYSTEM_EN : SYSTEM_TR;
    const userPrompt = locale === 'en' ? USER_EN : USER_TR;

    this.logger.log(`Gemini meal image: model=${modelId} locale=${locale}`);

    const model = this.client.getGenerativeModel({
      model: modelId,
      systemInstruction,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    let text: string;
    try {
      const result = await model.generateContent([
        userPrompt,
        { inlineData: { mimeType: payloadMime, data: payloadB64 } },
      ]);
      text = result.response.text().trim();
    } catch (err: unknown) {
      if (err instanceof GoogleGenerativeAIFetchError) {
        const st = err.status;
        this.logger.error(`Gemini meal HTTP ${st}: ${err.message}`);
        if (st === 429) {
          throw new HttpException(
            'Gemini API kotası veya hız limiti. Bir süre sonra tekrar deneyin.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        if (st === 404) {
          throw new BadRequestException(
            `Model bulunamadı: "${modelId}". .env GEMINI_MODEL değerini kontrol edin.`,
          );
        }
        if (st === 400) {
          throw new BadRequestException(
            `İstek reddedildi: ${err.message.slice(0, 200)}`,
          );
        }
        if (st === 401 || st === 403) {
          throw new ServiceUnavailableException('Gemini API anahtarı geçersiz.');
        }
        throw new ServiceUnavailableException(
          `Gemini hatası (${st ?? '?'}): ${err.message.slice(0, 300)}`,
        );
      }
      throw err;
    }

    const defaultTitle = locale === 'en' ? 'Meal' : 'Öğün';

    try {
      const jsonStr = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(jsonStr) as {
        description?: unknown;
        shortTitle?: unknown;
        nutrition?: unknown;
      };
      const description =
        typeof parsed.description === 'string' ? parsed.description.trim() : '';
      if (!description) {
        throw new BadRequestException('Model boş açıklama döndürdü.');
      }
      let shortTitle =
        typeof parsed.shortTitle === 'string' ? parsed.shortTitle.trim() : '';
      if (!shortTitle) {
        shortTitle = description.split(/\n/)[0]?.slice(0, 80).trim() || defaultTitle;
      }
      if (shortTitle.length > 200) shortTitle = shortTitle.slice(0, 200);
      const nutrition = normalizeNutrition(parsed.nutrition);
      return { description, shortTitle, nutrition };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`JSON parse fallback, ham metin kullanılıyor: ${text.slice(0, 120)}`);
      if (text.length < 10) {
        throw new BadRequestException('Yemek açıklaması üretilemedi.');
      }
      const description = text.slice(0, 8000);
      return {
        description,
        shortTitle: description.split(/\n/)[0]?.slice(0, 80).trim() || defaultTitle,
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }
  }
}
