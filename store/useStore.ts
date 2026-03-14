import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Theme } from "../theme";

const THEME_KEY = "@health_app_theme";
const TOKEN_KEY = "@health_app_token";

export interface MealEntry {
  id: string;
  name: string;
  date: string;
  source: "scan" | "manual";
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  authUser: AuthUser | null;
  authLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  loadStoredAuth: () => Promise<void>;

  // Meals
  scanCount: number;
  meals: MealEntry[];
  incrementScanCount: () => void;
  resetScanCount: () => void;
  addMeal: (name: string, source: "scan" | "manual") => void;

  // Theme
  theme: Theme;
  themeLoaded: boolean;
  setTheme: (theme: Theme) => void;
  loadStoredTheme: () => Promise<void>;

  // Settings
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  isAuthenticated: false,
  authUser: null,
  authLoading: true,
  setAuth: (user, token) => {
    AsyncStorage.setItem(TOKEN_KEY, token).catch(() => { });
    AsyncStorage.setItem("@health_app_user", JSON.stringify(user)).catch(
      () => { }
    );
    set({ isAuthenticated: true, authUser: user });
  },
  clearAuth: () => {
    AsyncStorage.multiRemove([TOKEN_KEY, "@health_app_user"]).catch(() => { });
    set({ isAuthenticated: false, authUser: null });
  },
  loadStoredAuth: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet([
        TOKEN_KEY,
        "@health_app_user",
      ]);
      if (token[1] && userStr[1]) {
        const user = JSON.parse(userStr[1]);
        set({ isAuthenticated: true, authUser: user, authLoading: false });
      } else {
        set({ authLoading: false });
      }
    } catch {
      set({ authLoading: false });
    }
  },

  // Meals
  scanCount: 0,
  meals: [],
  incrementScanCount: () =>
    set((state) => ({ scanCount: state.scanCount + 1 })),
  resetScanCount: () => set({ scanCount: 0 }),
  addMeal: (name: string, source: "scan" | "manual") =>
    set((state) => ({
      meals: [
        {
          id: Date.now().toString(),
          name,
          date: new Date().toISOString(),
          source,
        },
        ...state.meals,
      ],
    })),

  // Theme
  theme: "light",
  themeLoaded: false,
  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem(THEME_KEY, theme).catch(() => { });
  },
  loadStoredTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      const theme = stored === "dark" ? "dark" : "light";
      set({ theme, themeLoaded: true });
    } catch {
      set({ themeLoaded: true });
    }
  },

  // Settings
  notificationsEnabled: true,
  setNotificationsEnabled: (enabled) =>
    set({ notificationsEnabled: enabled }),
}));
