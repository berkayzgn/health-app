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
import type { LabelScanLocale, ScanImageKind } from './dto/scan-label.dto';
import type { NutrientsPerServing } from '../nutrition/nutrient-json';
import { parseNutrientsPerServing } from '../nutrition/nutrient-json';

/**
 * Varsayılan model: REST `generateContent` + görsel için AI Studio “Text-out” satırlarından seçim.
 *
 * Öncelik: günlük kota (RPD) ve dakika başı istek (RPM).
 * - gemini-3.1-flash-lite → 15 RPM, 250K TPM, 500 RPD (tabloda bu kullanım için en yüksek RPD)
 * - gemini-2.5-flash-lite → 10 RPM, 250K TPM, 20 RPD
 * - gemini-3-flash / gemini-2.5-flash → 5 RPM, 20 RPD
 *
 * Varsayılan zincir: önce 2.5 flash-lite (daha geniş anahtar uyumu), sonra 3.1 flash-lite (bazı projelerde daha yüksek RPD),
 * ardından flash sınıfı yedekler. `GEMINI_MODEL` ile ilk adımı sabitleyebilirsiniz.
 * 503 / model bulunamadı (404) durumunda otomatik yedek: `GEMINI_FALLBACK_MODEL` veya varsayılan model zinciri.
 *
 * Live API’deki “Unlimited” modeller (Native Audio, Flash Live) bu HTTP endpoint ile kullanılmaz.
 * Gemma / Imagen / TTS / Embedding farklı ürün; etiket görseli + JSON için Flash Lite doğru sınıf.
 */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_MODEL_SUGGESTIONS = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-3-flash',
] as const;

/** Üst Gemini uçlarında geçici 502/503 geldiğinde (yük artışı) kısa bekleme ile tekrar. */
const GEMINI_TRANSIENT_RETRIES = 3;

function backoffForGeminiTransient(attempt: number): Promise<void> {
  const ms = Math.min(10_000, 700 * 2 ** attempt);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvedGeminiModel(): string {
  const m = (process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim();
  return m.length > 0 ? m : DEFAULT_GEMINI_MODEL;
}

function uniqModelChain(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const t = id.trim();
    if (!t) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** Model zinciri: `GEMINI_MODEL` + (isteğe bağlı) `GEMINI_FALLBACK_MODEL` veya varsayılan adaylar. */
function resolvedGeminiModelChain(): string[] {
  const primary = resolvedGeminiModel();
  const chain: string[] = [primary];
  const manual = process.env.GEMINI_FALLBACK_MODEL?.trim();
  if (manual && manual !== primary && manual.toUpperCase() !== 'OFF') {
    chain.push(manual);
  } else {
    for (const candidate of GEMINI_MODEL_SUGGESTIONS) {
      if (candidate !== primary) chain.push(candidate);
    }
  }
  return uniqModelChain(chain);
}

function isGeminiModelNotFoundHttpException(e: unknown): boolean {
  if (!(e instanceof HttpException)) return false;
  if (e.getStatus() !== HttpStatus.BAD_REQUEST) return false;
  const body = e.getResponse();
  const msg =
    typeof body === 'string'
      ? body
      : typeof body === 'object' && body && 'message' in body
        ? String((body as { message?: unknown }).message ?? '')
        : '';
  return msg.includes('Gemini modeli bulunamadı');
}

function isLikelyGeminiCapacity503(e: unknown): boolean {
  if (!(e instanceof ServiceUnavailableException)) return false;
  const m = String((e as ServiceUnavailableException).message ?? '');
  return /\b503\b|\(503\)|high demand|Service Unavailable|yüksek talep|\b502\b|\(502\)/i.test(
    m,
  );
}

export interface GeminiLabelResult {
  productTitle: string;
  rawIngredients: string[];
  /** Porsiyon başına (veya yazılmış tablo için porsiyon tanımına göre) besin özeti — uygunsuz ise boş nesne */
  nutrientsPerServing: Partial<NutrientsPerServing>;
  /** Bir porsiyon ≈ gram; bilinmezse null */
  servingSizeG: number | null;
  servingsPerPack: number | null;
}

/** Ambalaj / besin bilgisi etiketi — yalnızca görünür yazıdan çıkarım; uydurma yok */
const LABEL_SYSTEM_INSTRUCTION_TR = `
Sen profesyonel bir gıda AMBALAJ ETİKETİ okuma asistanısın (karton, şişe, paket çıkartması, yazılı içindekiler).
Görüntü öncelikle basılı içindekiler / ürün adı için okunacak; yüz yüze tabak fotoğrafı gelirse metin çıkmıyorsa boş çıktı verebilirsin.

Öncelik (sırayla):
1. "Ürün adı", marka veya ticari ad görünürse "productTitle" alanına kısa tek satır yaz.
2. "İçindekiler / Ingredients / Contains / allergens / alerjen" veya dildeki eşdeğer yazılı bölümleri kullan.
3. Yazılı içindekiler listesindeki her bileşeni (virgülle ayrılmış parçalar) "ingredients" dizisinde AYRI dizi elemanı olarak ver; sıra etiketteki sırayı yansıtsın.

Besin değerleri tablosu:
- Öncelik hâlâ yazılı içindekiler ise onu listeleyin.
- Etikette sadece besin tablosu varsa tabloyu insanın okuyacağı şekilde kısa satırlara bölerek "ingredients"e ekle (ör. "Enerji 120 kcal/porsiyon", "Şeker 8g").
- OCR belirsizse metni olduğu gücünce koru.

Kısıtlar:
- Göremediğin metni kesin doğrulanmış bileşen diye yazma; etikette yazılmış olmayanı "ingredients"e ekleme.
- Çıktı dilî Türkçe: bileşen adlarında etiketteki metni olduğu gibi kullanmak uygunsa koru; yoksa yaygın Türkçe gıda terimleri kullan.

Yanıtta yalnızca şemaya uygun JSON; markdown veya kod bloğu yok.

Okunan metin sıfır veya belirsizse: productTitle "" ve ingredients [].
`.trim();

const LABEL_SYSTEM_INSTRUCTION_EN = `
You are an expert PACKAGE LABEL OCR assistant for food products.
Treat the photo as nutrition / ingredient wording on packaging (box, pouch, bottle, sticker). Do not hallucinate unseen text.

Priorities:
1. Put visible product or brand name in "productTitle" (one short line).
2. Use Ingredients / Contains / allergens / declaración / etc. sections when present.
3. Split comma-separated legally listed ingredient lines into separate "ingredients" array entries, preserving approximate order.

Nutrition facts only:
- If only a Nutrition Facts-style table is readable, encode each nutrient line as readable short strings (e.g. "Sugars 8g").
- Prefer explicit ingredient wording when visible.

Hard rules:
- Do NOT add allergens or additives that are NOT visible in the readable image text.

Output ingredient strings in English (translate from Turkish etc. where helpful). JSON only matching the schema — no markdown.
If nothing trustworthy is readable: productTitle "" and ingredients [].
`.trim();

const LABEL_USER_PROMPT_TR =
  'Bu görselde görünen paket içi / içindekiler besin ETİKETİNİ okuyup şemaya uygun JSON olarak döndür.';

const LABEL_USER_PROMPT_EN =
  'Read the visible PACKAGE INGREDIENT / nutrition LABEL in this photo and return JSON matching the schema.';

/** Hazır tabak — görsel çıkarım; alerjenler için güvenlik odaklı, mümkünse konservatif */
const MEAL_SYSTEM_INSTRUCTION_TR = `
Sen sağlık odaklı bir YİYECEK FOTOĞRAFI analistisin. Görsel: tabaktaki öğün, kahve fincanı, markette çıplak görünür yiyecek, restoran ortamı vb. olabilir; ambalaj etiketi zorunlu DEĞİL.

Ürün adı ("productTitle"):
- Görünen yemeği Türkçe kısa ve net tanımla (örn. "Izgara tavuk, bulgur pilavı, salata").
- Kahve/çikolata/aroma belirgin ise belirt (örn. "Latte kahve", "sütlü sıcak içecek").

"içindekiler" dizisi ("ingredients"):
1. doğrudan tanıdığın bileşenleri sırayla ekle (tavuk, pirinç, domates vb.).
2. tipik pişirmede sık kullanılan ama fotoğrafın çözünürlüğü yüzünden kesin seçilemeyenleri "muhtemel: ..." ile EK olarak listeleyerek belirt — özellikle süt tereyağı, buğday unu, yumurta, fındık, susam, soslar.
3. Alerjen konusunda profil eşleştirmesi için faydalı olsun: şüphe varsa daha çok çıkarım satırı tercih et (tahmin etmekten kaçınma demek DEĞİL; fotoğraf yanıltmasın diye "muhtemel" yaz).
4. Sadece körlemesine uydurmak için marka yazısı yokmuş gibi spesifik E-kodu veya etiketteki tam katkı madde satırını ekleme; görsel olarak tutarlı çıkarım yeterli.

Bulunamazsa görüntü çok blur veya yemek seçilemezse productTitle uygun düzey kısa açıklama + ingredients mümkünse boş dizi.

Çıktı dilî Türkçe. Yanıtta yalnızca şemaya uygun JSON — markdown veya kod bloğu yok.
`.trim();

const MEAL_SYSTEM_INSTRUCTION_EN = `
You analyze PHOTOS of prepared FOOD / drinks / unpackaged grocery items visible on screen — not primarily printed package labels.

"productTitle": short English phrase describing what is visibly on the plate/cup/hand (e.g. "Grilled chicken, rice, side salad"; "Chocolate dessert with powdered sugar").

"ingredients":
1. List ingredients you recognize from visuals (one string per identifiable item).
2. Add lines starting with "likely: " when common culinary components are plausible but not certain (examples: wheat flour in breading, dairy in sauces, nuts in desserts).
3. Bias mildly toward SAFETY visibility for allergy-aware users — include plausible allergens when justified by typical preparation of that dish appearance.
4. Do NOT invent specific E-numbers or verbatim legal label lines that are unreadable — stay honest to what's visible/inferable.

If the dish is unreadable/blur/empty framing, use minimal productTitle and prefer empty ingredients unless some food is identifiable.

English strings. JSON matching the schema only — no markdown or code fences.
`.trim();

const MEAL_USER_PROMPT_TR =
  'Bu fotoğraftaki görünür yiyecek/içeceği ve muhtemel bileşenleri şemaya uygun JSON olarak listele (sağlık profiline göre uyarı çıkması için yeterince açıklayıcı kal).';

const MEAL_USER_PROMPT_EN =
  'Infer visible foods and plausible components from this meal or food PHOTO into JSON matching the schema (prioritize allergens and staples when reasonably inferable).';

/** Auto mode: if readable label text exists, treat as label; otherwise treat as meal. */
const AUTO_SYSTEM_INSTRUCTION_TR = `
Sen tek bir fotoğraftan iki işi yapabilen bir analiz asistansın:

- Eğer görselde okunabilir basılı ETİKET / İÇİNDEKİLER metni varsa: "label" modundaki gibi davran (uydurma yok; yalnızca görünen metin).
- Eğer görsel esasen bir YEMEK/TABAK fotoğrafıysa veya okunabilir metin yoksa: "meal" modundaki gibi davran (görsel çıkarım; belirsizleri "muhtemel:" ile belirt).

Her durumda JSON şemasına uyan yanıt üret.
Yanıtta yalnızca JSON; markdown yok.
`.trim();

const AUTO_SYSTEM_INSTRUCTION_EN = `
You can do two jobs from a single photo:

- If there is readable PRINTED PACKAGE LABEL / INGREDIENT text: behave like label OCR mode (no hallucinations; only what is visible/readable).
- If it is primarily a MEAL/PLATE photo or there is no readable label text: behave like meal photo mode (visual inference; mark uncertainty with "likely: ").

Always return JSON matching the schema. JSON only (no markdown).
`.trim();

const AUTO_USER_PROMPT_TR =
  'Bu görselde eğer okunabilir etiket metni varsa onu oku; yoksa yemeği yorumla. Şemaya uygun JSON döndür.';

const AUTO_USER_PROMPT_EN =
  'If this photo contains readable label text, read it; otherwise infer the meal. Return JSON matching the schema.';

const SCHEMA_NUTRITION_HINT_TR = `
Şema ayrıca şu alanları ister — BESİN için yalnızca görüntüdeki tablo/sporiyon yazısından doğrulanabiliyorsa doldur; uydurma yok.
- "servingSizeG": etikette "1 porsiyon (…) g / ml" yazılmışsa yaklaşık grama çevirip sayı olarak ver (ml≈ekvivalent g için su dışında temkinli ol).
- "servingsPerPack": okunamazsa null.
- "nutrientsPerServing": sayıların hepsi bu porsiyon / yazılmış referansa göredir:
  enerji→energyKcal, karbonhidrat→carbohydrateG, şeker→sugarG, bazen ayrışan basit şeker→simpleSugarG,
  yağ→fatG, doymuş yağ→saturatedFatG, trans yağ→transFatG as transFatG mg veya gr etikete göre (tercihen gram),
  lif→fiberG, protein→proteinG, sodyum→sodiumMg, tuz→saltG gr, kolesterols→cholesterolMg, potasyum→potassiumMg, fosfor→phosphorusMg,
  alkollü içeceklerde alkole→alcoholG, kahve/bitki çay için kafein→caffeineMg (etikette varsa veya sıcak kahve fotoğrafı için yaklaşık),
  laktoz/laktoz içeriği yazılmışsa laktoz→lactoseG,
  sıvılar için su miktarına→waterL (litre tahmini bardak fotoğrafı için çok yaklaşık),
  glutensiz/ifade yazılmışsa gluten→glutenMg (yazı yoksa null),
  FODMAP sınırlı bilgi varsa yaklaşımsal fodmapApproxG (çok güvenilir değilse null).

Yemek fotoğrafı için: yaklaşık porsiyon gramı tahmini yapılabilir ve bilinen tabak bileşimi için yaklaşık makrolar yazılabilir; belirsizse null bırak.
`.trim();

const SCHEMA_NUTRITION_HINT_EN = `
The schema also requires extra fields — fill nutrient numbers ONLY when the label table or authoritative text is readable; never invent.
"servingSizeG": approximate grams per serving if stated ("per 30 g" etc.).
"servingsPerPack": null if unknown.
"nutrientsPerServing": same keys camelCase energyKcal, carbohydrateG, sugarG, fatG, saturatedFatG, transFatG, fiberG, proteinG,
sodiumMg, saltG (grams), cholesterolMg, potassiumMg, phosphorusMg, alcoholG, caffeineMg (drinks), lactoseG, waterL,
fructoseG (if labelled), simpleSugarG, refinedCarbG, purineMg, fodmapApproxG, glutenMg, chocolateG estimates when reasonable from the meal plate.

`.trim();

const N_PER_SCHEMA_PROPS = {
  energyKcal: { type: SchemaType.NUMBER },
  carbohydrateG: { type: SchemaType.NUMBER },
  sugarG: { type: SchemaType.NUMBER },
  simpleSugarG: { type: SchemaType.NUMBER },
  refinedCarbG: { type: SchemaType.NUMBER },
  fiberG: { type: SchemaType.NUMBER },
  fatG: { type: SchemaType.NUMBER },
  saturatedFatG: { type: SchemaType.NUMBER },
  transFatG: { type: SchemaType.NUMBER },
  sodiumMg: { type: SchemaType.NUMBER },
  saltG: { type: SchemaType.NUMBER },
  cholesterolMg: { type: SchemaType.NUMBER },
  caffeineMg: { type: SchemaType.NUMBER },
  proteinG: { type: SchemaType.NUMBER },
  fructoseG: { type: SchemaType.NUMBER },
  potassiumMg: { type: SchemaType.NUMBER },
  phosphorusMg: { type: SchemaType.NUMBER },
  alcoholG: { type: SchemaType.NUMBER },
  purineMg: { type: SchemaType.NUMBER },
  lactoseG: { type: SchemaType.NUMBER },
  waterL: { type: SchemaType.NUMBER },
  fodmapApproxG: { type: SchemaType.NUMBER },
  glutenMg: { type: SchemaType.NUMBER },
  chocolateG: { type: SchemaType.NUMBER },
} as const satisfies Record<string, { type: SchemaType }>;

const SCAN_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    productTitle: {
      type: SchemaType.STRING,
      description:
        'Çıktı diline/moduna göre kısa özet (ürün etiketi adı veya tabak/meal görünüşü)',
    },
    ingredients: {
      type: SchemaType.ARRAY,
      description: 'İçindekiler veya çıkarım satıları',
      items: {
        type: SchemaType.STRING,
      },
    },
    servingSizeG: {
      type: SchemaType.NUMBER,
      description: 'Tek referans sunumunun tahmini gram miktarı; bilinmezse 0 kullanmayın — doğrudan yoksayın',
    },
    servingsPerPack: { type: SchemaType.NUMBER },
    nutrientsPerServing: {
      type: SchemaType.OBJECT,
      description: 'Porsiyon başına yaklaşık besin miktarları; bilinmezse içi boş nesne',
      properties: N_PER_SCHEMA_PROPS,
    },
  },
  required: ['productTitle', 'ingredients', 'nutrientsPerServing'],
} satisfies ResponseSchema;

@Injectable()
export class GeminiVisionService {
  private readonly logger = new Logger(GeminiVisionService.name);
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      this.client = new GoogleGenerativeAI(key);
      const chain = resolvedGeminiModelChain();
      this.logger.log(
        `Gemini Vision hazır (model sırası: ${chain.join(' → ')}, JSON şema)`,
      );
    } else {
      this.logger.warn('GEMINI_API_KEY bulunamadı — Gemini devre dışı');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private async runGeminiVisionWithRetries(opts: {
    modelId: string;
    systemInstruction: string;
    userPrompt: string;
    payloadMime: 'image/jpeg' | 'image/png' | 'image/webp';
    payloadB64: string;
  }): Promise<string> {
    const { modelId, systemInstruction, userPrompt, payloadMime, payloadB64 } = opts;

    const model = this.client!.getGenerativeModel({
      model: modelId,
      systemInstruction,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: SCAN_RESPONSE_SCHEMA,
      },
    });

    let text = '';
    for (let attempt = 0; attempt < GEMINI_TRANSIENT_RETRIES; attempt++) {
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
        break;
      } catch (err: unknown) {
        if (!(err instanceof GoogleGenerativeAIFetchError)) {
          throw err;
        }
        const st = err.status;
        this.logger.error(`Gemini HTTP ${st} (model=${modelId}): ${err.message}`);

        if (st === 429) {
          const raw = err.message ?? '';
          const zeroQuota = /limit:\s*0\b/i.test(raw);
          const body = zeroQuota
            ? `Seçilen Gemini modeli (${modelId}) bu API anahtarı için kotada görünmüyor (limit: 0). AI Studio’da limiti 0 olmayan satırla eşleşen model deneyin: ${GEMINI_MODEL_SUGGESTIONS.join(
                ', ',
              )}. Anahtarın doğru Google Cloud projesine ait olduğunu doğrulayın.`
            : 'Gemini kotası veya hız limiti (RPM/RPD/TPM). AI Studio → Usage / Rate limits; gerekirse bekleyin veya faturalandırmayı açın.';
          throw new HttpException(body, HttpStatus.TOO_MANY_REQUESTS);
        }
        if (st === 404) {
          throw new BadRequestException(
            `Gemini modeli bulunamadı: "${modelId}". Deneyin: ${GEMINI_MODEL_SUGGESTIONS.join(
              ', ',
            )} (.env GEMINI_MODEL / GEMINI_FALLBACK_MODEL).`,
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

        const transient = st === 503 || st === 502;
        if (transient && attempt + 1 < GEMINI_TRANSIENT_RETRIES) {
          this.logger.warn(
            `Gemini geçici yoğunluk (${st}), ${attempt + 2}/${GEMINI_TRANSIENT_RETRIES}. denemeden önce bekleniyor… (${modelId})`,
          );
          await backoffForGeminiTransient(attempt);
          continue;
        }

        throw new ServiceUnavailableException(
          `Gemini hatası (${st ?? '?'}): ${err.message.slice(0, 300)}`,
        );
      }
    }

    if (!text) {
      throw new ServiceUnavailableException(
        'Gemini yanıt döndürmedi. Birkaç saniye sonra tekrar deneyin.',
      );
    }
    return text;
  }

  async extractLabelData(
    imageBase64: string,
    locale: LabelScanLocale = 'tr',
    scanKind: ScanImageKind = 'label',
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

    const mode = scanKind === 'auto' ? 'auto' : scanKind === 'meal' ? 'meal' : 'label';
    const systemInstructionBase =
      locale === 'en'
        ? mode === 'auto'
          ? AUTO_SYSTEM_INSTRUCTION_EN
          : mode === 'meal'
            ? MEAL_SYSTEM_INSTRUCTION_EN
            : LABEL_SYSTEM_INSTRUCTION_EN
        : mode === 'auto'
          ? AUTO_SYSTEM_INSTRUCTION_TR
          : mode === 'meal'
            ? MEAL_SYSTEM_INSTRUCTION_TR
            : LABEL_SYSTEM_INSTRUCTION_TR;
    const systemInstruction = `${systemInstructionBase}\n\n${locale === 'en' ? SCHEMA_NUTRITION_HINT_EN : SCHEMA_NUTRITION_HINT_TR}`;
    const userPrompt =
      locale === 'en'
        ? mode === 'auto'
          ? AUTO_USER_PROMPT_EN
          : mode === 'meal'
            ? MEAL_USER_PROMPT_EN
            : LABEL_USER_PROMPT_EN
        : mode === 'auto'
          ? AUTO_USER_PROMPT_TR
          : mode === 'meal'
            ? MEAL_USER_PROMPT_TR
            : LABEL_USER_PROMPT_TR;

    const modelChain = resolvedGeminiModelChain();
    this.logger.log(
      `Gemini model sırası: ${modelChain.join(' → ')} (locale=${locale} scanKind=${scanKind})`,
    );

    for (let mi = 0; mi < modelChain.length; mi++) {
      const modelId = modelChain[mi]!;
      try {
        const text = await this.runGeminiVisionWithRetries({
          modelId,
          systemInstruction,
          userPrompt,
          payloadMime,
          payloadB64,
        });
        if (mi > 0) {
          this.logger.log(`Gemini yedek model ile başarılı: ${modelId}`);
        }
        return parseGeminiResponse(text, locale);
      } catch (e: unknown) {
        const haveNext = mi + 1 < modelChain.length;
        if (haveNext && isLikelyGeminiCapacity503(e)) {
          this.logger.warn(
            `Gemini kapasite/geçici hata (${modelId}) — sıradaki: ${modelChain[mi + 1]}`,
          );
          continue;
        }
        if (haveNext && isGeminiModelNotFoundHttpException(e)) {
          this.logger.warn(
            `Gemini model bulunamadı (${modelId}) — sıradaki: ${modelChain[mi + 1]}`,
          );
          continue;
        }
        throw e;
      }
    }

    throw new ServiceUnavailableException(
      'Gemini çağrısı yapılamadı. GEMINI_MODEL / GEMINI_FALLBACK_MODEL ve GEMINI_API_KEY değerlerini kontrol edin.',
    );
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

function parseGeminiResponse(text: string, locale: LabelScanLocale): GeminiLabelResult {
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
      nutrientsPerServing?: unknown;
      servingSizeG?: unknown;
      servingsPerPack?: unknown;
    };

    const productTitle =
      typeof parsed.productTitle === 'string' ? parsed.productTitle.trim() : '';

    const rawIngredients = Array.isArray(parsed.ingredients)
      ? (parsed.ingredients as unknown[])
          .filter((i) => typeof i === 'string')
          .map((i) => lc(i as string))
          .filter((i) => i.length >= 2)
      : [];

    const nutrientsPerServing = parseNutrientsPerServing(parsed.nutrientsPerServing);
    const servingSizeG =
      typeof parsed.servingSizeG === 'number' && Number.isFinite(parsed.servingSizeG)
        ? parsed.servingSizeG
        : null;
    const servingsPerPack =
      typeof parsed.servingsPerPack === 'number' && Number.isFinite(parsed.servingsPerPack)
        ? parsed.servingsPerPack
        : null;

    return {
      productTitle,
      rawIngredients,
      nutrientsPerServing,
      servingSizeG,
      servingsPerPack,
    };
  } catch {
    const lines = text
      .split('\n')
      .map((l) => lc(l))
      .filter((l) => l.length >= 2 && l.length < 200);
    return {
      productTitle: '',
      rawIngredients: lines.slice(0, 150),
      nutrientsPerServing: {},
      servingSizeG: null,
      servingsPerPack: null,
    };
  }
}
