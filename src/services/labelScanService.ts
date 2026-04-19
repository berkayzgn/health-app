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
}

export interface ScanHistoryItem {
  id: string;
  productTitle: string;
  safetyLabel: SafetyLabel;
  matchedTriggers: MatchedTrigger[];
  rawIngredients: string[];
  scannedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/**
 * @param locale Uygulama dili — Gemini prompt ve sunucu özet metinleri buna göre (`tr` | `en`).
 */
export async function scanLabel(
  imageUri: string,
  locale: LabelScanLocale = 'tr',
): Promise<LabelScanResult> {
  // Görsel işleme ve LLM çağrısı backend’de (mobilde API anahtarı yok).
  const imageBase64 = await imageUriToBase64(imageUri);
  const headers = await getAuthHeaders();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/label-scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64, locale }),
      signal: controller.signal,
    });
  } catch (err) {
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
