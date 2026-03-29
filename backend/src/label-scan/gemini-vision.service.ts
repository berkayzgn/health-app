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
import type { LabelScanLocale } from './dto/scan-label.dto';

/**
 * Varsayılan model: REST `generateContent` + görsel için AI Studio “Text-out” satırlarından seçim.
 *
 * Öncelik: günlük kota (RPD) ve dakika başı istek (RPM).
 * - gemini-3.1-flash-lite → 15 RPM, 250K TPM, 500 RPD (tabloda bu kullanım için en yüksek RPD)
 * - gemini-2.5-flash-lite → 10 RPM, 250K TPM, 20 RPD
 * - gemini-3-flash / gemini-2.5-flash → 5 RPM, 20 RPD
 *
 * Live API’deki “Unlimited” modeller (Native Audio, Flash Live) bu HTTP endpoint ile kullanılmaz.
 * Gemma / Imagen / TTS / Embedding farklı ürün; etiket görseli + JSON için Flash Lite doğru sınıf.
 */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';

function resolvedGeminiModel(): string {
  const m = (process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim();
  return m.length > 0 ? m : DEFAULT_GEMINI_MODEL;
}

export interface GeminiLabelResult {
  productTitle: string;
  rawIngredients: string[];
}

const SYSTEM_INSTRUCTION_TR = `
Sen bir gıda etiketi analiz asistanısın. Görseldeki metni okuyup yapılandırılmış veri üretiyorsun.

Görevler:
1. Ürün adı veya marka görünüyorsa "productTitle" alanına yaz (tek satır, kısa).
2. "İçindekiler" / "Ingredients" / benzeri bölüm varsa, her bileşeni ingredients dizisine ayrı eleman olarak ekle.
3. Sadece besin değerleri tablosu varsa, tablodaki satırları anlamlı kısa metinler olarak ingredients listesine koy.
4. Çıktı dilin Türkçe olsun: etiket Türkçe ise metni olduğu gibi koru; yabancı etikette bileşen adlarını mümkünse Türkçe kullan veya etiketteki okunuşu koru.
5. Hiç metin okunamıyorsa productTitle boş string, ingredients boş dizi olmalı.

Yanıtta sadece şemaya uygun JSON üret; markdown veya kod bloğu kullanma.
`.trim();

const SYSTEM_INSTRUCTION_EN = `
You are a food label analysis assistant. Read the label image and return structured data.

Tasks:
1. If a product name or brand is visible, put it in "productTitle" (short, one line).
2. If an "Ingredients" / "İçindekiler" / similar section exists, add each component as a separate string in "ingredients".
3. If only a nutrition facts table is visible, add short readable lines (e.g. "fat 20g", "protein 5.2g") to "ingredients".
4. Output language must be English: use English names for ingredients; translate from Turkish or other languages when needed for clarity.
5. If no text is readable, return empty productTitle and empty ingredients array.

Return only valid JSON matching the schema; no markdown or code fences.
`.trim();

const USER_PROMPT_TR =
  'Bu görüntüdeki gıda ambalajı etiketini analiz et ve şemaya uygun JSON döndür.';

const USER_PROMPT_EN =
  'Analyze this food package label image and return JSON that matches the schema.';

/** Gemini JSON modu için şema — API yanıtı buna uymak zorunda */
const LABEL_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    productTitle: {
      type: SchemaType.STRING,
      description:
        'Görünür ürün adı veya marka; yoksa boş string',
    },
    ingredients: {
      type: SchemaType.ARRAY,
      description:
        'Etiketteki içindekiler veya besin bilgisi satırları; her biri ayrı dizi elemanı',
      items: {
        type: SchemaType.STRING,
        description: 'Tek bir bileşen veya besin satırı metni',
      },
    },
  },
  required: ['productTitle', 'ingredients'],
} satisfies ResponseSchema;

@Injectable()
export class GeminiVisionService {
  private readonly logger = new Logger(GeminiVisionService.name);
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      this.client = new GoogleGenerativeAI(key);
      const modelId = resolvedGeminiModel();
      this.logger.log(`Gemini Vision hazır (model=${modelId}, JSON şema)`);
    } else {
      this.logger.warn('GEMINI_API_KEY bulunamadı — Gemini devre dışı');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async extractLabelData(
    imageBase64: string,
    locale: LabelScanLocale = 'tr',
  ): Promise<GeminiLabelResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Gemini yapılandırılmamış. backend .env dosyasına GEMINI_API_KEY ekleyin.',
      );
    }

    const normalized = imageBase64
      .replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
      .replace(/\s/g, '');

    if (!normalized || normalized.length < 20) {
      throw new BadRequestException('Geçersiz görüntü verisi.');
    }

    const inputBuf = Buffer.from(normalized, 'base64');
    let payloadB64: string;
    let payloadMime: 'image/jpeg' | 'image/png' | 'image/webp';
    const maxEdge = Math.min(
      2048,
      Math.max(512, parseInt(process.env.GEMINI_IMAGE_MAX_EDGE ?? '1024', 10) || 1024),
    );
    const jpegQ = Math.min(
      95,
      Math.max(60, parseInt(process.env.GEMINI_JPEG_QUALITY ?? '78', 10) || 78),
    );
    try {
      const shrunk = await sharp(inputBuf)
        .rotate()
        .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: jpegQ })
        .toBuffer();
      payloadB64 = shrunk.toString('base64');
      payloadMime = 'image/jpeg';
      this.logger.log(
        `Görüntü Gemini için küçültüldü: ${inputBuf.length} → ${shrunk.length} bytes`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Sharp başarısız, ham görüntü gönderiliyor: ${msg}`);
      payloadB64 = normalized;
      payloadMime = detectMime(normalized);
    }

    const modelId = resolvedGeminiModel();
    const systemInstruction =
      locale === 'en' ? SYSTEM_INSTRUCTION_EN : SYSTEM_INSTRUCTION_TR;
    const userPrompt = locale === 'en' ? USER_PROMPT_EN : USER_PROMPT_TR;
    this.logger.log(`Gemini generateContent: model=${modelId} locale=${locale}`);
    const model = this.client.getGenerativeModel({
      model: modelId,
      systemInstruction,
      generationConfig: {
        temperature: 0.2,
        // İçindekiler JSON’u kısa; düşük tutmak TPM kotasına yardım eder
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: LABEL_RESPONSE_SCHEMA,
      },
    });

    let text: string;
    try {
      const result = await model.generateContent([
        userPrompt,
        {
          inlineData: {
            mimeType: payloadMime,
            data: payloadB64,
          },
        },
      ]);
      text = result.response.text().trim();
    } catch (err: unknown) {
      if (err instanceof GoogleGenerativeAIFetchError) {
        const st = err.status;
        this.logger.error(`Gemini HTTP ${st}: ${err.message}`);
        if (st === 429) {
          const raw = err.message ?? '';
          const zeroQuota = /limit:\s*0\b/i.test(raw);
          const body = zeroQuota
            ? `Seçilen Gemini modeli (${modelId}) bu API anahtarı için kotada görünmüyor (limit: 0). AI Studio’da limiti 0 olmayan satırla eşleşen model deneyin: gemini-3.1-flash-lite, gemini-2.5-flash-lite, gemini-2.5-flash. Anahtarın doğru Google Cloud projesine ait olduğunu doğrulayın.`
            : 'Gemini kotası veya hız limiti (RPM/RPD/TPM). AI Studio → Usage / Rate limits; gerekirse bekleyin veya faturalandırmayı açın.';
          throw new HttpException(body, HttpStatus.TOO_MANY_REQUESTS);
        }
        if (st === 404) {
          throw new BadRequestException(
            `Gemini modeli bulunamadı: "${modelId}". Deneyin: gemini-3.1-flash-lite, gemini-2.5-flash-lite, gemini-2.5-flash, gemini-3-flash (.env GEMINI_MODEL).`,
          );
        }
        if (st === 400) {
          throw new BadRequestException(
            `Gemini isteği reddedildi: ${err.message.slice(0, 200)}`,
          );
        }
        if (st === 401 || st === 403) {
          throw new ServiceUnavailableException(
            'Gemini API anahtarı geçersiz veya yetkisiz. GEMINI_API_KEY değerini kontrol edin.',
          );
        }
        throw new ServiceUnavailableException(
          `Gemini hatası (${st ?? '?'}): ${err.message.slice(0, 300)}`,
        );
      }
      throw err;
    }

    this.logger.log(`Gemini yanıtı (ilk 300 karakter): ${text.slice(0, 300)}...`);

    return parseGeminiResponse(text, locale);
  }
}

/** Base64'ün ilk baytlarından MIME tipini tahmin eder */
function detectMime(b64: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const header = Buffer.from(b64.slice(0, 12), 'base64');
  if (header[0] === 0x89 && header[1] === 0x50) return 'image/png';
  if (header[0] === 0xff && header[1] === 0xd8) return 'image/jpeg';
  if (header[0] === 0x52 && header[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

function parseGeminiResponse(
  text: string,
  locale: LabelScanLocale,
): GeminiLabelResult {
  const lc = (s: string) =>
    s.trim().toLocaleLowerCase(locale === 'en' ? 'en-US' : 'tr-TR');
  try {
    const jsonStr = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed = JSON.parse(jsonStr) as {
      productTitle?: unknown;
      ingredients?: unknown;
    };

    const productTitle =
      typeof parsed.productTitle === 'string' ? parsed.productTitle.trim() : '';

    const rawIngredients = Array.isArray(parsed.ingredients)
      ? (parsed.ingredients as unknown[])
          .filter((i) => typeof i === 'string')
          .map((i) => lc(i as string))
          .filter((i) => i.length >= 2)
      : [];

    return { productTitle, rawIngredients };
  } catch {
    const lines = text
      .split('\n')
      .map((l) => lc(l))
      .filter((l) => l.length >= 2 && l.length < 200);
    return { productTitle: '', rawIngredients: lines.slice(0, 150) };
  }
}
