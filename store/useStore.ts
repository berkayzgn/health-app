import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Theme } from "../theme";
import * as authService from "../services/authService";
import type { ProfileResponse } from "../services/authService";
import type { MedicalConditionDTO, MacroPlanDTO } from "../services/catalogService";
import { getMedicalConditions, getMacroPlans } from "../services/catalogService";

const THEME_KEY = "@health_app_theme";
// NOTE: aynı anahtar services/api.ts içinde de tanımlı — ileride ortak bir constants dosyasına taşınmalı.
const TOKEN_KEY = "@health_app_token";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  isAuthenticated: boolean;
  authUser: AuthUser | null;
  authLoading: boolean;
  userProfile: ProfileResponse | null;
  setAuth: (user: AuthUser, token: string) => void;
  refreshProfile: () => Promise<void>;
  setUserProfile: (p: ProfileResponse | null) => void;
  clearAuth: () => void;
  loadStoredAuth: () => Promise<void>;

  medicalConditions: MedicalConditionDTO[];
  medicalConditionsLoaded: boolean;
  loadMedicalConditions: () => Promise<void>;

  macroPlans: MacroPlanDTO[];
  macroPlansLoaded: boolean;
  loadMacroPlans: () => Promise<void>;

  theme: Theme;
  themeLoaded: boolean;
  setTheme: (theme: Theme) => void;
  loadStoredTheme: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  authUser: null,
  authLoading: true,
  userProfile: null,
  setAuth: (user, token) => {
    AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    AsyncStorage.setItem("@health_app_user", JSON.stringify(user)).catch(() => {});
    set({ isAuthenticated: true, authUser: user });
  },
  refreshProfile: async () => {
    try {
      const profile = await authService.getMe();
      set({ userProfile: profile });
    } catch {
      set({ userProfile: null });
    }
  },
  setUserProfile: (p) => set({ userProfile: p }),
  clearAuth: () => {
    AsyncStorage.multiRemove([TOKEN_KEY, "@health_app_user"]).catch(() => {});
    set({ isAuthenticated: false, authUser: null, userProfile: null });
  },
  loadStoredAuth: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet([TOKEN_KEY, "@health_app_user"]);
      if (token[1] && userStr[1]) {
        const profile = await authService.getMe();
        if (!profile) {
          await AsyncStorage.multiRemove([TOKEN_KEY, "@health_app_user"]);
          set({
            isAuthenticated: false,
            authUser: null,
            userProfile: null,
            authLoading: false,
          });
          return;
        }
        const user = { id: profile.id, email: profile.email, name: profile.name };
        await AsyncStorage.setItem("@health_app_user", JSON.stringify(user));
        set({
          isAuthenticated: true,
          authUser: user,
          userProfile: profile,
          authLoading: false,
        });
      } else {
        set({ authLoading: false, userProfile: null });
      }
    } catch {
      await AsyncStorage.multiRemove([TOKEN_KEY, "@health_app_user"]).catch(() => {});
      set({
        isAuthenticated: false,
        authUser: null,
        userProfile: null,
        authLoading: false,
      });
    }
  },

  medicalConditions: [],
  medicalConditionsLoaded: false,
  loadMedicalConditions: async () => {
    try {
      const conditions = await getMedicalConditions();
      set({ medicalConditions: conditions, medicalConditionsLoaded: true });
    } catch {
      set({ medicalConditionsLoaded: true });
    }
  },

  macroPlans: [],
  macroPlansLoaded: false,
  loadMacroPlans: async () => {
    try {
      const plans = await getMacroPlans();
      set({ macroPlans: plans, macroPlansLoaded: true });
    } catch {
      set({ macroPlansLoaded: true });
    }
  },

  theme: "light",
  themeLoaded: false,
  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
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
}));
