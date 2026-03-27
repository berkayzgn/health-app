import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/** Simülatörde false; fiziksel telefonda true. Web’de expo-device true dönebildiği için Platform ile sınırlıyoruz. */
function isNativePhysicalDevice(): boolean {
    if (Platform.OS === 'web') return false;
    return Device.isDevice;
}

function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, '');
}

function getExtraApiUrl(): string | undefined {
    const extra = Constants.expoConfig?.extra;
    if (extra && typeof extra === 'object' && 'apiUrl' in extra) {
        const v = (extra as { apiUrl?: unknown }).apiUrl;
        if (typeof v === 'string' && v.trim().length > 0) {
            return trimTrailingSlash(v.trim());
        }
    }
    return undefined;
}

const envFromProcess = process.env.EXPO_PUBLIC_API_URL
    ? trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL)
    : undefined;
const extraApiUrlAtInit = getExtraApiUrl();
const envBaseUrl = envFromProcess ?? extraApiUrlAtInit;

function parseApiPort(url: string | undefined): string {
    if (!url) return '3000';
    try {
        const p = new URL(url).port;
        return p || '3000';
    } catch {
        return '3000';
    }
}

const apiPort = parseApiPort(envBaseUrl);

function isLoopbackHostname(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

function isLoopbackApiUrl(url: string): boolean {
    try {
        return isLoopbackHostname(new URL(url).hostname);
    } catch {
        return false;
    }
}

/** Metro’nun bağlandığı host (genelde Mac’in LAN IP’si) — fiziksel cihazda loopback yerine kullanılır. */
function metroLanHost(): string | null {
    const uri = Constants.expoConfig?.hostUri;
    if (uri) {
        const host = uri.split(':')[0];
        if (host && !isLoopbackHostname(host)) return host;
    }
    const dbg =
        Constants.expoGoConfig?.debuggerHost ??
        (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;
    if (dbg) {
        const host = dbg.split(':')[0];
        if (host && !isLoopbackHostname(host)) return host;
    }
    const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
    const scriptHost = scriptURL?.match(/https?:\/\/([^/:]+)/)?.[1];
    if (scriptHost && !isLoopbackHostname(scriptHost)) {
        return scriptHost;
    }
    return null;
}

/** Geliştirme: simülatör / emülatör — host makine. */
const devLoopbackHost = Platform.select({
    ios: 'localhost',
    android: '10.0.2.2',
    default: 'localhost',
});

const MISSING_API_PLACEHOLDER =
    'http://__CONFIGURE_EXPO_PUBLIC_API_URL__.invalid';

function resolveApiBaseUrl(): string {
    if (envBaseUrl) {
        if (
            __DEV__ &&
            isNativePhysicalDevice() &&
            isLoopbackApiUrl(envBaseUrl)
        ) {
            const lan = metroLanHost();
            if (lan) {
                return `http://${lan}:${parseApiPort(envBaseUrl)}`;
            }
            console.warn(
                '[api] Fiziksel cihazda .env loopback (127.0.0.1) — Metro LAN IP okunamadı. Mac IP: ipconfig getifaddr en0 → EXPO_PUBLIC_API_URL=http://O_IP:3000',
            );
        }
        return envBaseUrl;
    }

    if (__DEV__) {
        if (isNativePhysicalDevice()) {
            const lan = metroLanHost();
            if (lan) return `http://${lan}:${apiPort}`;
        }
        return `http://${devLoopbackHost}:${apiPort}`;
    }

    return MISSING_API_PLACEHOLDER;
}

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
    console.log('[api] API_BASE_URL =', API_BASE_URL, {
        fromEnv: !!envFromProcess,
        fromExtra: !!extraApiUrlAtInit,
        isDevice: isNativePhysicalDevice(),
        metroLan: metroLanHost(),
    });
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
    if (
        API_BASE_URL === MISSING_API_PLACEHOLDER ||
        API_BASE_URL.includes('__CONFIGURE_EXPO_PUBLIC')
    ) {
        throw new Error(
            'Production için EXPO_PUBLIC_API_URL tanımlı olmalı (EAS / release build).',
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
        const aborted = err instanceof Error && err.name === 'AbortError';
        const deviceHint =
            __DEV__ && isNativePhysicalDevice()
                ? ' Aynı Wi‑Fi; Mac’te backend:3000 ve docker çalışsın. iOS: Ayarlar → Yerel Ağ → uygulama açık.'
                : '';
        throw new Error(
            aborted
                ? `Sunucu ${REQUEST_TIMEOUT_MS / 1000}s içinde yanıt vermedi (${API_BASE_URL})${deviceHint}`
                : `Sunucuya ulaşılamadı (${API_BASE_URL}). ${detail}${deviceHint}`,
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
