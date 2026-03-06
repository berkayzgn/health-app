import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Theme } from "../theme";

const THEME_KEY = "@health_app_theme";

export interface MealEntry {
  id: string;
  name: string;
  date: string;
  source: "scan" | "manual";
}

interface AppState {
  scanCount: number;
  meals: MealEntry[];
  theme: Theme;
  notificationsEnabled: boolean;
  themeLoaded: boolean;
  incrementScanCount: () => void;
  resetScanCount: () => void;
  addMeal: (name: string, source: "scan" | "manual") => void;
  setTheme: (theme: Theme) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  loadStoredTheme: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  scanCount: 0,
  meals: [],
  theme: "light",
  notificationsEnabled: true,
  themeLoaded: false,
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
  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
  },
  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  loadStoredTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      const theme = stored === "dark" ? "dark" : "light";
      set({ theme, themeLoaded: true });
    } catch {
      set({ themeLoaded: true });
    }
  },
}));
