import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_BASE_URL } from './api';

const TOKEN_KEY = '@health_app_token';
const MEAL_IMAGE_ANALYZE_TIMEOUT_MS = 120_000;

async function imageUriToBase64(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return base64.replace(/\s/g, '');
}

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

export interface DayNutritionTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface MealRecord {
    id: string;
    name: string;
    source: string;
    mealType: string;
    portion?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string;
}

export interface TodayMealsResponse {
    meals: MealRecord[];
    totals: DayNutritionTotals;
}

export async function getTodayMeals(): Promise<TodayMealsResponse> {
    return api.get<TodayMealsResponse>('/meals/today');
}

/** Son kayıtlar için `dateFrom` / `dateTo` ISO tarih veya tam ISO string (backend `Date` ile parse eder). */
export async function listMeals(params?: {
    dateFrom?: string;
    dateTo?: string;
}): Promise<MealRecord[]> {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    const qs = q.toString();
    return api.get<MealRecord[]>(`/meals${qs ? `?${qs}` : ''}`);
}

export type MealTypeId = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'midSnack';

export interface CreateMealInput {
    name: string;
    source: 'manual' | 'scan';
    mealType: MealTypeId;
    portion?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    date?: string;
}

export async function createMeal(body: CreateMealInput): Promise<MealRecord> {
    return api.post<MealRecord>('/meals', body);
}

export type MealImageLocale = 'tr' | 'en';

export interface MealImageNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface MealImageAnalysisResult {
    description: string;
    shortTitle: string;
    nutrition: MealImageNutrition;
}

/**
 * Öğün sohbeti: yerel görsel URI → Gemini açıklama + tahmini besin değerleri (`locale`).
 */
export async function analyzeMealImageFromUri(
    imageUri: string,
    locale: MealImageLocale = 'tr',
): Promise<MealImageAnalysisResult> {
    const imageBase64 = await imageUriToBase64(imageUri);
    const headers = await getAuthHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MEAL_IMAGE_ANALYZE_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}/meals/analyze-image`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ imageBase64, locale }),
            signal: controller.signal,
        });
    } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError';
        throw new Error(
            aborted
                ? 'Meal image analysis timed out. Please try again.'
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

    return response.json() as Promise<MealImageAnalysisResult>;
}
