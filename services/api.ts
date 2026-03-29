import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

/** iOS simülatör / Android emülatör: makine = localhost */
const DEV_FALLBACK_LOCAL = 'http://127.0.0.1:3000';

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

function isLoopbackApiUrl(url: string): boolean {
    return /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(url);
}

/** Metro / Expo CLI’nin bağlandığı makinenin hostname’i (genelde Mac LAN IP). */
function parseDevMachineHostname(raw: string | undefined | null): string | null {
    if (!raw || typeof raw !== 'string') return null;
    const t = raw.trim();
    if (!t) return null;
    // hostUri: "192.168.1.5:8081"
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(t)) {
        return t.split(':')[0] ?? null;
    }
    try {
        const withScheme = t.includes('://') ? t : `http://${t}`;
        const u = new URL(withScheme.replace(/^exp:\/\//i, 'http://'));
        const h = u.hostname;
        if (!h || h === 'localhost' || h === '127.0.0.1') return null;
        return h;
    } catch {
        return null;
    }
}

function getDevMachineHostnameFromExpo(): string | null {
    const manifest = Constants.manifest as { debuggerHost?: string } | null;
    const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null;
    const candidates = [
        Constants.expoConfig?.hostUri,
        Constants.experienceUrl,
        manifest?.debuggerHost,
        expoGo?.debuggerHost,
    ];
    for (const c of candidates) {
        const h = parseDevMachineHostname(c);
        if (h) return h;
    }
    return null;
}

function readMetroScriptUrl(): string | undefined {
    const nm = NativeModules as { SourceCode?: { scriptURL?: string } };
    let u = nm.SourceCode?.scriptURL;
    if (u) return u;
    try {
        // RN yeni mimari: TurboModule (NativeModules.SourceCode boş olabilir)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const NativeSourceCode = require('react-native/Libraries/NativeModules/specs/NativeSourceCode')
            .default as { getConstants: () => { scriptURL?: string } };
        u = NativeSourceCode.getConstants()?.scriptURL;
    } catch {
        /* noop */
    }
    return u;
}

/**
 * Metro’nun servis ettiği JS bundle URL’si — fiziksel cihazda genelde Mac’in LAN IP’si
 * (örn. http://192.168.1.5:8081/...). Expo Constants’tan daha güvenilir.
 */
function getHostnameFromMetroScriptUrl(): string | null {
    const scriptURL = readMetroScriptUrl();
    if (!scriptURL || typeof scriptURL !== 'string') return null;
    if (!/^https?:\/\//i.test(scriptURL)) return null;
    try {
        const url = new URL(scriptURL);
        const h = url.hostname;
        if (!h || h === 'localhost' || h === '127.0.0.1') return null;
        return h;
    } catch {
        return null;
    }
}

function getLanDevHost(): string | null {
    return getHostnameFromMetroScriptUrl() ?? getDevMachineHostnameFromExpo();
}

function resolveApiBaseUrl(): string {
    const envUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL ?? '');

    if (!__DEV__) {
        return envUrl;
    }

    // Açıkça LAN / uzak URL verilmişse her zaman onu kullan
    if (envUrl && !isLoopbackApiUrl(envUrl)) {
        return envUrl;
    }

    // Geliştirme: Metro’nun kullandığı makine IP’si = backend için de aynı host (port 3000)
    const lanHost = getLanDevHost();
    if (lanHost) {
        return `http://${lanHost}:3000`;
    }

    if (envUrl && isLoopbackApiUrl(envUrl)) {
        console.warn(
            '[api] Metro bundle URL’sinden LAN IP okunamadı ve .env localhost kullanılıyor. Fiziksel cihazda çalışmaz. .env: EXPO_PUBLIC_API_URL=http://<Mac-LAN-IP>:3000 veya Metro’yu ağ üzerinden çalıştırın (aynı Wi‑Fi).',
        );
    }

    return envUrl || DEV_FALLBACK_LOCAL;
}

export const API_BASE_URL: string = resolveApiBaseUrl();

if (__DEV__) {
    console.log('[api] API_BASE_URL =', API_BASE_URL);
}

const TOKEN_KEY = '@health_app_token';
const REQUEST_TIMEOUT_MS = __DEV__ ? 25_000 : 12_000;

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
            'API_BASE_URL boş. Production build ise EXPO_PUBLIC_API_URL .env dosyasını kontrol edin.',
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
