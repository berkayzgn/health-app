import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiVisionService } from './gemini-vision.service';
import type { LabelScanLocale } from './dto/scan-label.dto';

function resolveLocale(l?: string): LabelScanLocale {
  return l === 'en' ? 'en' : 'tr';
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type SafetyLabel = 'safe' | 'caution' | 'avoid';

export interface MatchedTrigger {
  /** Canonical filter token (e.g. "honey") */
  filterToken: string;
  /** Human-readable English label (e.g. "Honey") */
  filterLabel: string;
  /** The extracted ingredient name that triggered this match */
  ingredientName: string;
  /** Condition code(s) that flagged this ingredient */
  conditionCodes: string[];
}

export interface ScanIngredient {
  name: string;
  /** "warning" when this ingredient matches a trigger food */
  variant: 'normal' | 'warning';
  tag: string;
  description: string;
  warningFooter?: string;
}

export interface LabelScanApiResult {
  productTitle: string;
  summaryLine: string;
  safetyLabel: SafetyLabel;
  glycemicImpact: string;
  processingGrade: string;
  ingredients: ScanIngredient[];
  matchedTriggers: MatchedTrigger[];
  scanId: string;
}

// ── Filter glossary types (from abc.json root) ────────────────────────────────

interface FilterEntry {
  label: string;
  alias: string[];
}

interface FilterGlossary {
  [token: string]: FilterEntry;
}

/** Türkçe karakterleri ASCII’ye indirger; etiket metni ile sözlük eşlemesi için */
function foldTurkishAscii(s: string): string {
  const map: Record<string, string> = {
    ş: 's',
    Ş: 's',
    ğ: 'g',
    Ğ: 'g',
    ü: 'u',
    Ü: 'u',
    ö: 'o',
    Ö: 'o',
    ç: 'c',
    Ç: 'c',
    ı: 'i',
    İ: 'i',
    â: 'a',
    Â: 'a',
    î: 'i',
    Î: 'i',
    û: 'u',
    Û: 'u',
  };
  return s
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase();
}

/**
 * Türkçe / yaygın Latince içerikten İngilizce tetik sözcükleri türetir
 * (abc.json filter_alias çoğunlukla İngilizce).
 */
function impliedEnglishHints(foldedIngredient: string): string[] {
  const hints: string[] = [];
  const f = foldedIngredient;

  if (/\bseker|sekerler|seker\s|seker,|seker\)|^seker$/i.test(f) || f.includes('seker')) {
    hints.push('sugar', 'simple sugar');
  }
  if (f.includes('glukoz') || f.includes('glucose')) hints.push('simple sugar', 'sugar');
  if (f.includes('fruktoz') || f.includes('fructose')) hints.push('fructose', 'sugar');
  if (f.includes('dextroz') || f.includes('dextrose')) hints.push('simple sugar');
  if (f.includes('sukroz') || f.includes('sucrose')) hints.push('sugar', 'simple sugar');
  if (f.includes('bal')) hints.push('honey');
  if (f.includes('pekmez') || f.includes('molasses')) hints.push('molasses', 'syrup');
  if (f.includes('surup') || f.includes('syrup') || f.includes('sirop')) hints.push('syrup');
  if (f.includes('karbonhidrat')) hints.push('carbohydrate');
  if (f.includes('nisasta') || f.includes('starch')) hints.push('refined carb', 'carbohydrate');
  if (f.includes('bugday') || f.includes('bugday unu') || f.includes('wheat')) hints.push('white bread', 'refined carb');
  if (f.includes('tuz') || f.includes('sodium')) hints.push('salt', 'sodium');
  if (f.includes('sut') || f.includes('laktoz') || f.includes('lactose')) hints.push('dairy', 'milk');
  if (f.includes('yumurta') || f.includes('egg')) hints.push('egg');
  if (f.includes('findik') || f.includes('fistik') || f.includes('badem')) {
    hints.push('tree nuts', 'tree nut mix', 'peanut', 'almond');
  }

  return hints;
}

function resolveAbcJsonPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'abc.json'),
    path.resolve(__dirname, '..', '..', 'abc.json'),
    path.resolve(__dirname, '..', '..', '..', 'abc.json'),
    path.resolve(__dirname, '..', '..', '..', '..', 'abc.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class LabelScanService implements OnModuleInit {
  private readonly logger = new Logger(LabelScanService.name);
  private filterGlossary: FilterGlossary = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiVisionService,
  ) {}

  onModuleInit() {
    const abcPath = resolveAbcJsonPath();
    if (!abcPath) {
      this.logger.error('abc.json not found (cwd / dist paths). Label scan glossary empty.');
      return;
    }
    try {
      const raw = fs.readFileSync(abcPath, 'utf-8');
      const parsed = JSON.parse(raw) as { filter_alias_en?: FilterGlossary };
      this.filterGlossary = parsed.filter_alias_en ?? {};
      this.logger.log(
        `Filter glossary from ${abcPath}: ${Object.keys(this.filterGlossary).length} tokens`,
      );
    } catch (err) {
      this.logger.error('Could not read abc.json for filter glossary', err);
    }
  }

  // ── Public entry point ──────────────────────────────────────────────────────

  async scanLabel(
    userId: string,
    imageBase64: string,
    localeInput?: string,
  ): Promise<LabelScanApiResult> {
    const locale = resolveLocale(localeInput);
    // 1. Gemini Vision → içindekiler + ürün adı
    const { productTitle, rawIngredients, glycemicImpact, processingGrade } =
      await this.extractStructuredFromLabel(imageBase64, locale);

    // 2. Load user's medical conditions + trigger foods
    const conditions = await this.loadUserConditions(userId);

    // 3. Match extracted ingredients against condition trigger foods
    const { matchedTriggers, ingredientDetails } = this.matchIngredients(
      rawIngredients,
      conditions,
      locale,
    );

    // 4. Determine safety label
    const safetyLabel = this.deriveSafetyLabel(matchedTriggers);

    // 5. Persist scan record
    const scan = await this.prisma.scanHistory.create({
      data: {
        userId,
        productTitle,
        rawIngredients: rawIngredients as unknown as import('@prisma/client').Prisma.JsonArray,
        matchedTriggers: matchedTriggers as unknown as import('@prisma/client').Prisma.JsonArray,
        safetyLabel,
      },
    });

    // 6. Build response
    const hasWarnings = matchedTriggers.length > 0;
    const summaryLine =
      locale === 'en'
        ? hasWarnings
          ? `${matchedTriggers.length} ingredient(s) flagged against your health profile.`
          : 'No ingredients flagged for your health conditions.'
        : hasWarnings
          ? `Sağlık profilinize göre ${matchedTriggers.length} içerik işaretlendi.`
          : 'Sağlık durumlarınız için işaretlenen içerik yok.';

    return {
      productTitle,
      summaryLine,
      safetyLabel,
      glycemicImpact,
      processingGrade,
      ingredients: ingredientDetails,
      matchedTriggers,
      scanId: scan.id,
    };
  }

  /** Gemini ile ham etiket verisi önizlemesi (JWT gerekli). */
  async previewOcrText(
    imageBase64: string,
    localeInput?: string,
  ): Promise<{
    ocrText: string;
    lineCount: number;
    characterCount: number;
  }> {
    const locale = resolveLocale(localeInput);
    const { productTitle, rawIngredients } =
      await this.gemini.extractLabelData(imageBase64, locale);
    const ocrText = [productTitle, ...rawIngredients].filter(Boolean).join('\n');
    return {
      ocrText,
      lineCount: rawIngredients.length,
      characterCount: ocrText.length,
    };
  }

  async getScanHistory(userId: string, limit = 20) {
    return this.prisma.scanHistory.findMany({
      where: { userId },
      orderBy: { scannedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        productTitle: true,
        safetyLabel: true,
        matchedTriggers: true,
        rawIngredients: true,
        scannedAt: true,
      },
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async extractStructuredFromLabel(
    imageBase64: string,
    locale: LabelScanLocale,
  ): Promise<{
    productTitle: string;
    rawIngredients: string[];
    glycemicImpact: string;
    processingGrade: string;
  }> {
    const { productTitle, rawIngredients } =
      await this.gemini.extractLabelData(imageBase64, locale);

    this.logger.log(
      `Label pipeline: Gemini Vision (${rawIngredients.length} ingredients, title="${productTitle}", locale=${locale})`,
    );

    if (rawIngredients.length === 0) {
      throw new BadRequestException(
        locale === 'en'
          ? 'Could not read content from the label. Try a clearer photo or angle.'
          : 'Etiketten içerik okunamadı. Daha net veya farklı açıdan bir fotoğraf deneyin.',
      );
    }

    const unknown = locale === 'en' ? 'Unknown' : 'Bilinmiyor';
    return {
      productTitle,
      rawIngredients,
      glycemicImpact: unknown,
      processingGrade: unknown,
    };
  }

  private async loadUserConditions(
    userId: string,
  ): Promise<{ code: string; triggerFoods: string[] }[]> {
    const rows = await this.prisma.userMedicalCondition.findMany({
      where: { userId },
      include: {
        condition: { select: { code: true, triggerFoods: true } },
      },
    });
    return rows.map((r) => ({
      code: r.condition.code,
      triggerFoods: (r.condition.triggerFoods as string[]) ?? [],
    }));
  }

  /**
   * Bir içerik satırı, sözlükteki terimlerle (İngilizce + Türkçe ipuçları) eşleşiyor mu?
   */
  private rowMatchesFilterEntry(
    candidates: Set<string>,
    token: string,
    entry: FilterEntry,
    minSubLen: number,
  ): boolean {
    const terms = [
      token.replace(/_/g, ' ').toLowerCase(),
      entry.label.toLowerCase(),
      ...entry.alias.map((a) => a.toLowerCase()),
    ]
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    for (const cand of candidates) {
      const cFold = foldTurkishAscii(cand);
      for (const term of terms) {
        const tFold = foldTurkishAscii(term);
        if (
          cand === term ||
          cFold === term ||
          cand === tFold ||
          cFold === tFold
        ) {
          return true;
        }
        if (term.length >= minSubLen) {
          if (
            cand.includes(term) ||
            cFold.includes(term) ||
            cand.includes(tFold) ||
            cFold.includes(tFold)
          ) {
            return true;
          }
        }
        if (cand.length >= minSubLen) {
          if (term.includes(cand) || tFold.includes(cFold)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * İçindekiler satırlarını kullanıcı koşullarındaki tetikleyicilerle eşleştirir.
   * Gemini Türkçe dönebildiği için ASCII katlama + yaygın TR→EN ipuçları kullanılır.
   */
  private matchIngredients(
    rawIngredients: string[],
    conditions: { code: string; triggerFoods: string[] }[],
    locale: LabelScanLocale,
  ): {
    matchedTriggers: MatchedTrigger[];
    ingredientDetails: ScanIngredient[];
  } {
    const triggerMap = new Map<string, string[]>();
    for (const cond of conditions) {
      for (const token of cond.triggerFoods) {
        const existing = triggerMap.get(token) ?? [];
        existing.push(cond.code);
        triggerMap.set(token, existing);
      }
    }

    const matchedTriggers: MatchedTrigger[] = [];
    const ingredientDetails: ScanIngredient[] = [];
    const seenTriggerIngredient = new Set<string>();
    const minSubLen = 3;

    const lcLocale = locale === 'en' ? 'en-US' : 'tr-TR';

    for (const ingName of rawIngredients) {
      const normalised = ingName.trim().toLocaleLowerCase(lcLocale);
      const folded = foldTurkishAscii(normalised);
      const hints = impliedEnglishHints(folded);
      const candidates = new Set<string>([
        normalised,
        folded,
        ...hints.map((h) => h.toLowerCase()),
      ]);

      const matches: {
        token: string;
        filterLabel: string;
        conditionCodes: string[];
      }[] = [];

      for (const [token, entry] of Object.entries(this.filterGlossary)) {
        if (!triggerMap.has(token)) continue;
        if (!this.rowMatchesFilterEntry(candidates, token, entry, minSubLen)) {
          continue;
        }
        matches.push({
          token,
          filterLabel: entry.label,
          conditionCodes: triggerMap.get(token) ?? [],
        });
      }

      const byToken = new Map<
        string,
        { token: string; filterLabel: string; conditionCodes: string[] }
      >();
      for (const m of matches) {
        if (!byToken.has(m.token)) byToken.set(m.token, m);
      }
      const unique = [...byToken.values()];

      if (unique.length > 0) {
        for (const m of unique) {
          const dedupeKey = `${m.token}::${ingName}`;
          if (!seenTriggerIngredient.has(dedupeKey)) {
            seenTriggerIngredient.add(dedupeKey);
            matchedTriggers.push({
              filterToken: m.token,
              filterLabel: m.filterLabel,
              ingredientName: ingName,
              conditionCodes: m.conditionCodes,
            });
          }
        }
        const labelStr = unique.map((m) => m.filterLabel).join(', ');
        const codes = [
          ...new Set(unique.flatMap((m) => m.conditionCodes)),
        ].join(', ');
        ingredientDetails.push({
          name: ingName,
          variant: 'warning',
          tag: locale === 'en' ? 'Caution' : 'Dikkat',
          description:
            locale === 'en'
              ? `This ingredient (${labelStr}) is flagged for your health condition(s): ${codes}.`
              : `Bu içerik (${labelStr}) sağlık durumunuz için işaretlendi: ${codes}.`,
          warningFooter:
            locale === 'en'
              ? 'Avoid or consume with caution'
              : 'Kaçının veya dikkatli tüketin',
        });
      } else {
        ingredientDetails.push({
          name: ingName,
          variant: 'normal',
          tag: locale === 'en' ? 'OK' : 'Uygun',
          description:
            locale === 'en'
              ? 'No conflict detected with your health profile.'
              : 'Profilinizle çakışma tespit edilmedi.',
        });
      }
    }

    return { matchedTriggers, ingredientDetails };
  }

  private deriveSafetyLabel(triggers: MatchedTrigger[]): SafetyLabel {
    if (triggers.length === 0) return 'safe';
    if (triggers.length <= 2) return 'caution';
    return 'avoid';
  }
}
