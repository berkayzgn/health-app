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

/**
 * Reads the Metro bundle URL from the RN bridge.
 * Old architecture: `NativeModules.SourceCode.scriptURL`
 * New architecture (TurboModules): falls back to a deep require that is
 * intentionally kept inside a try-catch so it silently degrades when the
 * internal module path changes across RN versions.
 */
function readMetroScriptUrl(): string | undefined {
    const nm = NativeModules as { SourceCode?: { scriptURL?: string } };
    const legacy = nm.SourceCode?.scriptURL;
    if (legacy) return legacy;
    try {
        // Dynamic require is necessary here — this internal TurboModule path
        // has no stable public export. Wrapped in try-catch for forward-compat.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('react-native/Libraries/NativeModules/specs/NativeSourceCode') as
            | { default?: { getConstants?: () => { scriptURL?: string } } }
            | { getConstants?: () => { scriptURL?: string } };
        const getConstants =
            ('default' in mod ? mod.default?.getConstants : undefined) ??
            (mod as { getConstants?: () => { scriptURL?: string } }).getConstants;
        return getConstants?.()?.scriptURL;
    } catch {
        return undefined;
    }
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

export type ApiErrorCode =
    | 'SESSION_EXPIRED'
    | 'AUTH_INVALID_CREDENTIALS'
    | 'AUTH_USER_NOT_FOUND'
    | 'AUTH_EMAIL_IN_USE'
    | 'AUTH_WEAK_PASSWORD'
    | 'BAD_REQUEST'
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'TIMEOUT'
    | 'NETWORK_ERROR'
    | 'HTTP_ERROR';

export class ApiError extends Error {
    status?: number;
    code: ApiErrorCode;
    raw?: unknown;

    constructor(message: string, opts: { status?: number; code: ApiErrorCode; raw?: unknown }) {
        super(message);
        this.name = 'ApiError';
        this.status = opts.status;
        this.code = opts.code;
        this.raw = opts.raw;
    }
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

function isAuthEndpoint(endpoint: string): boolean {
    return endpoint.startsWith('/auth/');
}

async function safeReadErrorBody(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function extractMessageFromErrorBody(body: unknown): string | null {
    if (!body) return null;
    if (typeof body === 'string') return body;
    if (typeof body !== 'object') return null;

    const anyBody = body as { message?: unknown; error?: unknown };
    const msg = anyBody.message ?? anyBody.error;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) {
        const first = msg.find((x) => typeof x === 'string');
        return typeof first === 'string' ? first : null;
    }
    return null;
}

function classifyAuthError(message: string | null, status: number): ApiErrorCode {
    const m = (message ?? '').toLowerCase();

    // NestJS / custom messages (best-effort)
    if (status === 401) {
        if (m.includes('user not found') || m.includes('kullanıcı bulunamad')) return 'AUTH_USER_NOT_FOUND';
        if (m.includes('wrong password') || m.includes('invalid password') || m.includes('hatalı şifre'))
            return 'AUTH_INVALID_CREDENTIALS';
        if (m.includes('invalid credentials') || m.includes('unauthorized')) return 'AUTH_INVALID_CREDENTIALS';
        return 'AUTH_INVALID_CREDENTIALS';
    }

    if (status === 404) return 'AUTH_USER_NOT_FOUND';
    return 'HTTP_ERROR';
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = REQUEST_TIMEOUT_MS,
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
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
        throw new ApiError(
            aborted
                ? `Sunucu ${timeoutMs / 1000}s içinde yanıt vermedi (${API_BASE_URL})`
                : `Sunucuya ulaşılamadı (${API_BASE_URL}). ${detail}`,
            { code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR' },
        );
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const raw = await safeReadErrorBody(response);
        const message = extractMessageFromErrorBody(raw) ?? null;

        // Login/register: 401 = kimlik bilgisi hatası (session expired değil)
        if (response.status === 401 && isAuthEndpoint(endpoint)) {
            const code = classifyAuthError(message, response.status);
            throw new ApiError(message ?? 'Unauthorized', { status: response.status, code, raw });
        }

        if (response.status === 401) {
            await removeToken().catch(() => {});
            _onUnauthorized?.();
            // Keep message human-friendly for screens that show e.message directly.
            throw new ApiError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', {
                status: response.status,
                code: 'SESSION_EXPIRED',
                raw,
            });
        }

        const status = response.status;
        const code: ApiErrorCode =
            status === 400
                ? 'BAD_REQUEST'
                : status === 404
                    ? 'NOT_FOUND'
                    : status === 429
                        ? 'RATE_LIMITED'
                        : 'HTTP_ERROR';

        // Some screens rely on literal sentinel messages (e.g. "NOT_FOUND").
        const fallbackMessage = status === 404 ? 'NOT_FOUND' : `HTTP ${status}`;
        throw new ApiError(message ?? fallbackMessage, { status, code, raw });
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

    /**
     * POST with a custom timeout — for long-running backend tasks such as
     * Gemini Vision / OCR where the default 12–25 s timeout is too short.
     */
    postLong: <T>(endpoint: string, body: unknown, timeoutMs: number) =>
        request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }, timeoutMs),
};
