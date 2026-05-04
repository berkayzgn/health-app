import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiVisionService } from './gemini-vision.service';
import type { LabelScanLocale, ScanImageKind } from './dto/scan-label.dto';
import { foldTurkishAscii } from '../common/string-fold';
import { compactNumericRecord } from '../nutrition/nutrient-json';
import { ScanQuotaService } from '../users/scan-quota.service';

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
  ingredients: ScanIngredient[];
  matchedTriggers: MatchedTrigger[];
  scanId: string;
  /** Porsiyon başına yaklaşık besin özeti — her zaman sıfır veya sayıların birleşimi */
  nutrientsPerServing: Record<string, number>;
  servingSizeG: number | null;
  servingsPerPack?: number | null;
  consumed: boolean;
  portionsConsumed: number;
}

// ── Filter glossary types (from abc.json root) ────────────────────────────────

interface FilterEntry {
  label: string;
  alias: string[];
}

interface FilterGlossary {
  [token: string]: FilterEntry;
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
    private readonly scanQuota: ScanQuotaService,
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
    scanKind: ScanImageKind = 'label',
    timeZone?: string,
  ): Promise<LabelScanApiResult> {
    try {
      await this.scanQuota.assertScanAllowed(userId, timeZone);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'ScanQuotaExceeded') {
        throw new HttpException(
          {
            code: 'SCAN_QUOTA_EXCEEDED',
            message: 'Daily scan limit reached for your plan.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw e;
    }
    const locale = resolveLocale(localeInput);
    const {
      productTitle,
      rawIngredients,
      nutrientsPerServing,
      servingSizeG,
      servingsPerPack,
    } = await this.extractStructuredFromLabel(imageBase64, locale, scanKind);

    const nutrientsRecord = compactNumericRecord(
      nutrientsPerServing,
    ) as Record<string, number>;

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

    const hasWarnings = matchedTriggers.length > 0;
    const summaryLine =
      locale === 'en'
        ? hasWarnings
          ? `${matchedTriggers.length} ingredient(s) flagged against your health profile.`
          : 'No ingredients flagged for your health conditions.'
        : hasWarnings
          ? `Sağlık profilinize göre ${matchedTriggers.length} içerik işaretlendi.`
          : 'Sağlık durumlarınız için işaretlenen içerik yok.';

    // 5. Persist scan record
    const snap = {
      summaryLine,
      ingredients: ingredientDetails,
      nutrientsPerServing: nutrientsRecord,
      servingSizeG,
      servingsPerPack,
    };

    const scan = await this.prisma.scanHistory.create({
      data: {
        userId,
        productTitle,
        rawIngredients: rawIngredients as unknown as import('@prisma/client').Prisma.JsonArray,
        matchedTriggers: matchedTriggers as unknown as import('@prisma/client').Prisma.JsonArray,
        safetyLabel,
        nutrientsPerServing: nutrientsRecord as unknown as import('@prisma/client').Prisma.InputJsonValue,
        servingSizeG,
        consumed: false,
        portionsConsumed: 1,
        resultSnapshot:
          snap as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    // 6. Build response
    return {
      productTitle,
      summaryLine,
      safetyLabel,
      ingredients: ingredientDetails,
      matchedTriggers,
      scanId: scan.id,
      nutrientsPerServing: nutrientsRecord,
      servingSizeG,
      servingsPerPack,
      consumed: false,
      portionsConsumed: 1,
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
        consumed: true,
        portionsConsumed: true,
      },
    });
  }

  /** Tek kayıt — geçmiş detay ekranı (resultSnapshot varsa tam analiz). */
  async getScanById(userId: string, id: string) {
    const row = await this.prisma.scanHistory.findFirst({
      where: { id, userId },
    });
    if (!row) return null;

    const triggers = row.matchedTriggers as unknown as MatchedTrigger[];
    const rawList = row.rawIngredients as unknown as string[];
    const snap = row.resultSnapshot as {
      summaryLine?: string;
      ingredients?: ScanIngredient[];
      nutrientsPerServing?: Record<string, number>;
      servingSizeG?: number | null;
      servingsPerPack?: number | null;
    } | null;

    const hasWarnings = triggers.length > 0;
    const summaryLine =
      snap?.summaryLine ??
      (hasWarnings
        ? `Sağlık profilinize göre ${triggers.length} içerik işaretlendi.`
        : 'Sağlık durumlarınız için işaretlenen içerik yok.');

    const ingredients = snap?.ingredients?.length ? snap.ingredients : [];
    const hasRichDetail = Boolean(snap?.ingredients?.length);
    const nutRow = row.nutrientsPerServing as unknown as Record<string, number> | null;
    const nutrientsPerServing =
      nutRow && Object.keys(nutRow).length > 0 ? nutRow : snap?.nutrientsPerServing ?? {};

    return {
      id: row.id,
      productTitle: row.productTitle,
      safetyLabel: row.safetyLabel as SafetyLabel,
      matchedTriggers: triggers,
      rawIngredients: rawList,
      scannedAt: row.scannedAt.toISOString(),
      summaryLine,
      ingredients,
      hasRichDetail,
      consumed: row.consumed,
      portionsConsumed: row.portionsConsumed,
      nutrientsPerServing,
      servingSizeG: row.servingSizeG ?? snap?.servingSizeG ?? null,
      servingsPerPack: snap?.servingsPerPack ?? null,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async extractStructuredFromLabel(
    imageBase64: string,
    locale: LabelScanLocale,
    scanKind: ScanImageKind,
  ): Promise<Awaited<ReturnType<GeminiVisionService['extractLabelData']>>> {
    const extraction = await this.gemini.extractLabelData(imageBase64, locale, scanKind);

    const { productTitle, rawIngredients } = extraction;

    this.logger.log(
      `Vision pipeline (${scanKind}): Gemini (${rawIngredients.length} ingredients, title="${productTitle}", locale=${locale})`,
    );

    if (rawIngredients.length === 0) {
      if (scanKind === 'meal') {
        throw new BadRequestException(
          locale === 'en'
            ? 'Could not infer foods from this photo. Try a closer shot with better lighting.'
            : 'Bu fotoğraftan yemek veya bileşen çıkarılamadı. Daha yakın çekim veya daha iyi ışıkla tekrar dene.',
        );
      }
      throw new BadRequestException(
        locale === 'en'
          ? 'Could not read content from the label. Try a clearer photo or angle.'
          : 'Etiketten içerik okunamadı. Daha net veya farklı açıdan bir fotoğraf deneyin.',
      );
    }

    return extraction;
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
