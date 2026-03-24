import { api, setToken, removeToken } from './api';

interface AuthResponse {
    access_token: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}

interface ProfileResponse {
    id: string;
    email: string;
    name: string;
    heightCm?: string;
    weightKg?: string;
    conditionTypes?: string[];
    dietaryPreferences?: string[];
}

export async function register(
    email: string,
    password: string,
    name: string,
): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        name,
    });
    await setToken(response.access_token);
    return response;
}

export async function login(
    email: string,
    password: string,
): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
    });
    await setToken(response.access_token);
    return response;
}

export async function logout(): Promise<void> {
    await removeToken();
}

export async function getMe(): Promise<ProfileResponse | null> {
    return api.get<ProfileResponse | null>('/users/me');
}
