import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API_BASE_URL — her zaman EXPO_PUBLIC_API_URL env değişkeninden okunur.
 * Lokal sunucu fallback'i yoktur; tüm ortamlarda uzak sunucuya gidilir.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

if (__DEV__) {
    console.log('[api] API_BASE_URL =', API_BASE_URL);
}

// NOTE: aynı anahtar store/useStore.ts içinde de tanımlı — ileride ortak bir constants dosyasına taşınmalı.
const TOKEN_KEY = '@health_app_token';
const REQUEST_TIMEOUT_MS = __DEV__ ? 25_000 : 12_000;

/**
 * 401 alındığında çağrılacak callback (döngüsel import olmadan store entegrasyonu).
 * app/_layout.tsx içinde clearAuth ile register edilir.
 */
type UnauthorizedCallback = () => void;
let _onUnauthorized: UnauthorizedCallback | null = null;

export function registerUnauthorizedCallback(cb: UnauthorizedCallback): void {
    _onUnauthorized = cb;
}

async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
}

function formatFetchError(err: unknown): string {
    if (err instanceof Error) return err.message || err.name;
    if (typeof err === 'string') return err;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    if (!API_BASE_URL) {
        throw new Error(
            'EXPO_PUBLIC_API_URL tanımlı değil. .env dosyasını kontrol edin.',
        );
    }

    const token = await getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] =
            `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });
    } catch (err) {
        const detail = formatFetchError(err);
        console.error('[api] FETCH ERROR:', API_BASE_URL + endpoint, detail, err);
        const aborted = err instanceof Error && err.name === 'AbortError';
        throw new Error(
            aborted
                ? `Sunucu ${REQUEST_TIMEOUT_MS / 1000}s içinde yanıt vermedi (${API_BASE_URL})`
                : `Sunucuya ulaşılamadı (${API_BASE_URL}). ${detail}`,
        );
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        // 401 → token geçersiz / süresi dolmuş: token temizle ve global callback'i tetikle
        if (response.status === 401) {
            await removeToken().catch(() => {});
            _onUnauthorized?.();
            throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        }
        const error = await response
            .json()
            .catch(() => ({ message: 'Bir hata oluştu' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, body: unknown) =>
        request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        }),

    patch: <T>(endpoint: string, body: unknown) =>
        request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),

    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
