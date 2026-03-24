import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, '');
}

/** Metro / Expo’nun bildirdiği geliştirme makinesi IP’si (fiziksel cihaz için). */
function resolveLanHost(): string | null {
    const fromHostUri = Constants.expoConfig?.hostUri?.split(':')[0];
    if (fromHostUri) return fromHostUri;

    const manifest = Constants.manifest as { debuggerHost?: string } | null;
    const dbg =
        Constants.expoGoConfig?.debuggerHost ?? manifest?.debuggerHost;
    if (dbg) return dbg.split(':')[0];

    const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
    const scriptHost = scriptURL?.match(/https?:\/\/([^/:]+)/)?.[1];
    if (
        scriptHost &&
        scriptHost !== 'localhost' &&
        scriptHost !== '127.0.0.1'
    ) {
        return scriptHost;
    }
    return null;
}

// Öncelik: .env EXPO_PUBLIC_API_URL -> fiziksel cihazda LAN IP -> simülatör / emulator localhost
const envBaseUrl = process.env.EXPO_PUBLIC_API_URL
    ? trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL)
    : undefined;
const lanHost = resolveLanHost();
const isSimulator = !Constants.isDevice;

const fallbackHost = Platform.select({
    ios: isSimulator ? 'localhost' : lanHost ?? 'localhost',
    android: isSimulator
        ? '10.0.2.2'
        : lanHost ?? '10.0.2.2',
    default: lanHost ?? 'localhost',
});

const API_BASE_URL = envBaseUrl ?? `http://${fallbackHost}:3000`;

if (__DEV__) {
    console.log('[api] API_BASE_URL =', API_BASE_URL, {
        isDevice: Constants.isDevice,
        env: !!envBaseUrl,
    });
}

if (__DEV__ && Constants.isDevice && !envBaseUrl && !lanHost) {
    console.warn(
        '[api] EXPO_PUBLIC_API_URL tanımlı değil ve Metro ana makine IP’si okunamadı; ' +
            'fiziksel cihazda istekler başarısız olabilir. Proje kökünde .env: EXPO_PUBLIC_API_URL=http://BILGISAYAR_IP:3000',
    );
}
const TOKEN_KEY = '@health_app_token';
const REQUEST_TIMEOUT_MS = 12_000;

async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = await getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
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
        const hint =
            Constants.isDevice && !isSimulator
                ? ' Aynı Wi‑Fi’de olduğunuzdan emin olun; gerekirse proje kökünde .env ile EXPO_PUBLIC_API_URL=http://BILGISAYAR_IP:3000 ayarlayın ve Metro’yu yeniden başlatın.'
                : '';
        const aborted = err instanceof Error && err.name === 'AbortError';
        throw new Error(
            aborted
                ? `Sunucu yanıt vermedi (zaman aşımı, ${REQUEST_TIMEOUT_MS / 1000}s). Backend çalışıyor mu? (${API_BASE_URL})${hint}`
                : `Sunucuya ulaşılamadı (${API_BASE_URL}).${hint}`,
        );
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }));
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
