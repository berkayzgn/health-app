import * as FileSystem from 'expo-file-system/legacy';
import { api, ApiError } from './api';

/** Gemini Vision + OCR taraması uzun sürebilir (~60s); standart 12–25s yetmez. */
const SCAN_TIMEOUT_MS = 120_000;

// ── Types (mirror backend) ──────────────────────────────────────────────────

export type SafetyLabel = 'safe' | 'caution' | 'avoid';

export interface ScanIngredient {
  name: string;
  variant: 'normal' | 'warning';
  tag: string;
  description: string;
  warningFooter?: string;
  cautionAmount?: string;
}

export interface MatchedTrigger {
  filterToken: string;
  filterLabel: string;
  ingredientName: string;
  conditionCodes: string[];
}

export interface LabelScanResult {
  productTitle: string;
  summaryLine: string;
  safetyLabel: SafetyLabel;
  ingredients: ScanIngredient[];
  matchedTriggers: MatchedTrigger[];
  scanId: string;
  nutrientsPerServing?: Record<string, number>;
  servingSizeG?: number | null;
  servingsPerPack?: number | null;
  consumed?: boolean;
  portionsConsumed?: number;
}

export interface ScanHistoryItem {
  id: string;
  productTitle: string;
  safetyLabel: SafetyLabel;
  matchedTriggers: MatchedTrigger[];
  rawIngredients: string[];
  scannedAt: string;
  consumed?: boolean;
  portionsConsumed?: number;
}

export function isBackendScanId(scanId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    scanId.trim(),
  );
}

export type NutrientTotals = Record<string, number>;

export type TriggeredRuleApi = {
  ruleCode: string;
  conditionCode: string;
  riskLevel: string;
  current: number;
  threshold: number;
  operator: string;
  message: string;
};

export type ConsumeScanResponse = {
  localDate: string;
  dailyTotals: NutrientTotals;
  triggeredRules: TriggeredRuleApi[];
};

export type DailyDashboardRuleRow = {
  code: string;
  riskLevel: string;
  operator: string;
  threshold: number;
  fires: boolean;
};

export type DailyDashboardNutrientRow = {
  slug: string;
  triggerName: string;
  unit: string;
  current: number | null;
  readiness: string;
  worstLevel: 'ok' | 'yellow' | 'red' | 'unknown';
  rules: DailyDashboardRuleRow[];
};

export type DailyDashboardCondition = {
  conditionCode: string;
  conditionName: string;
  rows: DailyDashboardNutrientRow[];
};

export type DailySummaryResponse = {
  date: string;
  timezone: string;
  totals: NutrientTotals;
  conditions: DailyDashboardCondition[];
};

export type WeeklySummaryResponse = {
  trackable: boolean;
  timezone: string;
  weekStart: string;
  weekEnd: string;
  totals: NutrientTotals;
  conditions: DailyDashboardCondition[];
};

export type ScanUsageResponse = {
  localDate: string;
  timezone: string;
  plan: 'starter' | 'plus' | 'pro';
  usedToday: number;
  dailyLimit: number | null;
};

// ── Error helpers ─────────────────────────────────────────────────────────────

/** Günlük kota aşıldığında (HTTP 429) fırlatılır — tarama ekranı mesajı için. */
export function throwScanQuotaExceeded(): never {
  const e = new Error('SCAN_QUOTA_EXCEEDED');
  e.name = 'LabelScanQuota';
  throw e;
}

export function isScanQuotaError(err: unknown): boolean {
  return err instanceof Error && err.name === 'LabelScanQuota';
}

/** Sunucudan JSON ile dönen HTTP hatası — ağ kopması değil. */
function throwLabelScanHttp(message: string): never {
  const e = new Error(message || 'Analysis failed');
  e.name = 'LabelScanHttp';
  throw e;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function imageUriToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64.replace(/\s/g, '');
}

function deviceIanaTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export type LabelScanLocale = 'tr' | 'en';
export type ScanImageKind = 'label' | 'meal' | 'auto';

/**
 * Sends the label image to the backend (Gemini Vision + JSON extraction),
 * matches ingredients against the user's health conditions, and returns
 * a structured result.
 *
 * Uses a 120 s timeout (Gemini OCR on large images can take ~60 s).
 * Quota errors (429) surface as `LabelScanQuota`; server errors as `LabelScanHttp`.
 */
export async function scanLabel(
  imageUri: string,
  locale: LabelScanLocale = 'tr',
  scanKind: ScanImageKind = 'label',
): Promise<LabelScanResult> {
  const imageBase64 = await imageUriToBase64(imageUri);
  const tz = deviceIanaTimezone();

  try {
    return await api.postLong<LabelScanResult>(
      '/label-scan',
      { imageBase64, locale, scanKind, timezone: tz },
      SCAN_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 429) throwScanQuotaExceeded();

      const msg = err.message ?? '';
      // Backward-compat: older backend DTOs reject unknown "scanKind".
      if (/scanKind/i.test(msg) && /should not exist/i.test(msg)) {
        try {
          return await api.postLong<LabelScanResult>(
            '/label-scan',
            { imageBase64, locale, timezone: tz },
            SCAN_TIMEOUT_MS,
          );
        } catch (retryErr) {
          if (retryErr instanceof ApiError) {
            if (retryErr.status === 429) throwScanQuotaExceeded();
            throwLabelScanHttp(retryErr.message);
          }
          throw retryErr;
        }
      }

      throwLabelScanHttp(msg || `HTTP ${err.status}`);
    }
    // Network / timeout errors from api.ts pass through as-is
    throw err;
  }
}

/** Tarama geçmişi ekranı — sunucu `take` limiti; eski kayıtlar için yüksek tutulur. */
export const SCAN_HISTORY_ARCHIVE_LIMIT = 500;

export async function getScanHistory(limit = 20): Promise<ScanHistoryItem[]> {
  return api.get<ScanHistoryItem[]>(`/label-scan/history?limit=${limit}`);
}

export interface ScanHistoryDetail extends ScanHistoryItem {
  summaryLine: string;
  ingredients: ScanIngredient[];
  hasRichDetail: boolean;
  consumed?: boolean;
  portionsConsumed?: number;
  nutrientsPerServing?: Record<string, number>;
  servingSizeG?: number | null;
  servingsPerPack?: number | null;
}

export async function getScanHistoryDetail(id: string): Promise<ScanHistoryDetail> {
  return api.get<ScanHistoryDetail>(`/label-scan/history/${encodeURIComponent(id)}`);
}

export async function consumeScanHistory(
  scanId: string,
  portions: 0.25 | 0.5 | 1 | 2,
  opts?: { timezone?: string; locale?: LabelScanLocale },
): Promise<ConsumeScanResponse> {
  return api.post<ConsumeScanResponse>(
    `/label-scan/history/${encodeURIComponent(scanId)}/consume`,
    {
      portions,
      timezone: opts?.timezone ?? deviceIanaTimezone(),
      locale: opts?.locale ?? 'tr',
    },
  );
}

export async function clearScanConsumption(scanId: string): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(
    `/label-scan/history/${encodeURIComponent(scanId)}/consume`,
  );
}

export async function fetchDailySummary(params?: {
  date?: string;
  timezone?: string;
  locale?: LabelScanLocale;
}): Promise<DailySummaryResponse> {
  const tz = params?.timezone ?? deviceIanaTimezone();
  const loc = params?.locale ?? 'tr';
  const q = new URLSearchParams({ timezone: tz, locale: loc });
  if (params?.date) q.set('date', params.date);
  return api.get<DailySummaryResponse>(`/users/me/daily-summary?${q}`);
}

export async function fetchWeeklySummary(params?: {
  timezone?: string;
  locale?: LabelScanLocale;
}): Promise<WeeklySummaryResponse> {
  const tz = params?.timezone ?? deviceIanaTimezone();
  const loc = params?.locale ?? 'tr';
  const q = new URLSearchParams({ timezone: tz, locale: loc });
  return api.get<WeeklySummaryResponse>(`/users/me/weekly-rules?${q}`);
}

export async function fetchScanUsage(params?: { timezone?: string }): Promise<ScanUsageResponse> {
  const tz = params?.timezone ?? deviceIanaTimezone();
  const q = new URLSearchParams({ timezone: tz });
  return api.get<ScanUsageResponse>(`/users/me/scan-usage?${q}`);
}
