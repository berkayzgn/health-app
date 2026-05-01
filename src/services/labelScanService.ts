import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

const TOKEN_KEY = '@health_app_token';
const REQUEST_TIMEOUT_MS = 120_000; // Tesseract OCR can take up to ~60s on large images

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
  /** Yeni backend alanları — eski sunucularda olmayabilir */
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

/** Sunucudan dönen gerçek UUID taramaları için (simülatör mock hariç). */
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

export type WeeklyRulesResponse = {
  trackable: boolean;
  rules: { code: string; title: string }[];
  note: string;
};

async function imageUriToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64.replace(/\s/g, '');
}

/** NestJS exception gövdesi: `message` string veya string[] olabilir. */
function normalizeNestMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Analysis failed';
  const m = (body as { message?: unknown }).message;
  if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join(' ');
  if (typeof m === 'string') return m;
  return 'Analysis failed';
}

/** Sunucudan JSON ile dönen HTTP hatası — ağ kopması değil; "Could not reach server" ile sarılmamalı. */
function throwLabelScanHttp(message: string): never {
  const e = new Error(message || 'Analysis failed');
  e.name = 'LabelScanHttp';
  throw e;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Sends the label image to the backend (Gemini Vision + JSON extraction),
 * matches ingredients against the user's health conditions, and returns
 * a structured result.
 */
export type LabelScanLocale = 'tr' | 'en';

/** Sunucudaki ScanImageKind ile aynı: etiket (OCR) vs yemek fotoğrafı (görsel çıkarım). */
export type ScanImageKind = 'label' | 'meal' | 'auto';

/**
 * @param locale Uygulama dili — Gemini prompt ve sunucu özet metinleri buna göre (`tr` | `en`).
 * @param scanKind `label`: ambalaj/içindekiler; `meal`: hazır tabak fotoğrafı.
 */
export async function scanLabel(
  imageUri: string,
  locale: LabelScanLocale = 'tr',
  scanKind: ScanImageKind = 'label',
): Promise<LabelScanResult> {
  // Görsel işleme ve LLM çağrısı backend’de (mobilde API anahtarı yok).
  const imageBase64 = await imageUriToBase64(imageUri);
  const headers = await getAuthHeaders();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    const bodyWithKind = JSON.stringify({ imageBase64, locale, scanKind });
    response = await fetch(`${API_BASE_URL}/label-scan`, {
      method: 'POST',
      headers,
      body: bodyWithKind,
      signal: controller.signal,
    });

    // Backward-compat: older backend DTOs may reject unknown "scanKind".
    if (!response.ok) {
      const raw = await response.json().catch(() => ({}));
      const msg = normalizeNestMessage(raw);
      if (/scanKind/i.test(msg) && /should not exist/i.test(msg)) {
        response = await fetch(`${API_BASE_URL}/label-scan`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ imageBase64, locale }),
          signal: controller.signal,
        });
      } else {
        throwLabelScanHttp(msg || `HTTP ${response.status}`);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'LabelScanHttp') {
      throw err;
    }
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new Error(
      aborted
        ? 'Label analysis timed out. Please try again.'
        : `Could not reach server. ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    const msg = normalizeNestMessage(raw);
    throw new Error(msg || `HTTP ${response.status}`);
  }

  return response.json() as Promise<LabelScanResult>;
}

/**
 * Fetches the authenticated user's past scan records.
 */
export async function getScanHistory(limit = 20): Promise<ScanHistoryItem[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/label-scan/history?limit=${limit}`,
    { headers },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<ScanHistoryItem[]>;
}

/** GET /label-scan/history/:id — tam analiz (resultSnapshot ile). */
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
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/label-scan/history/${encodeURIComponent(id)}`, {
    headers,
  });
  if (response.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<ScanHistoryDetail>;
}

function deviceIanaTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function consumeScanHistory(
  scanId: string,
  portions: 0.25 | 0.5 | 1 | 2,
  opts?: { timezone?: string; locale?: LabelScanLocale },
): Promise<ConsumeScanResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/label-scan/history/${encodeURIComponent(scanId)}/consume`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        portions,
        timezone: opts?.timezone ?? deviceIanaTimezone(),
        locale: opts?.locale ?? "tr",
      }),
    },
  );
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(normalizeNestMessage(raw) || `HTTP ${response.status}`);
  }
  return raw as ConsumeScanResponse;
}

export async function clearScanConsumption(scanId: string): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/label-scan/history/${encodeURIComponent(scanId)}/consume`,
    { method: "DELETE", headers },
  );
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(normalizeNestMessage(raw) || `HTTP ${response.status}`);
  }
  return response.json() as Promise<{ ok: boolean }>;
}

export async function fetchDailySummary(params?: {
  date?: string;
  timezone?: string;
  locale?: LabelScanLocale;
}): Promise<DailySummaryResponse> {
  const headers = await getAuthHeaders();
  const tz = params?.timezone ?? deviceIanaTimezone();
  const loc = params?.locale ?? "tr";
  const q = new URLSearchParams({
    timezone: tz,
    locale: loc,
  });
  if (params?.date) q.set("date", params.date);
  const response = await fetch(`${API_BASE_URL}/users/me/daily-summary?${q}`, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<DailySummaryResponse>;
}

export async function fetchWeeklyRulesPlaceholder(): Promise<WeeklyRulesResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users/me/weekly-rules`, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<WeeklyRulesResponse>;
}
