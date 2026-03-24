import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Priority: explicit env var -> simulator defaults -> Metro host -> fallback
const envBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
const scriptHost = scriptURL?.match(/https?:\/\/([^/:]+)/)?.[1];
const isSimulator = !Constants.isDevice;

const fallbackHost = Platform.select({
    ios: isSimulator ? 'localhost' : scriptHost ?? expoHost ?? 'localhost',
    android: isSimulator ? '10.0.2.2' : scriptHost ?? expoHost ?? '10.0.2.2',
    default: scriptHost ?? expoHost ?? 'localhost',
});

const API_BASE_URL = envBaseUrl ?? `http://${fallbackHost}:3000`;
const TOKEN_KEY = '@health_app_token';

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

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (err) {
        throw new Error(`Sunucuya ulaşılamadı (${API_BASE_URL})`);
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
