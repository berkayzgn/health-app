import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import tr from "./locales/tr.json";

const LANGUAGE_KEY = "@health_app_language";
/** Onboarding dil modalı tamamlandığında yazılan son kullanıcı id’si — yeni kullanıcıda modal yeniden gösterilir. */
const LANG_PICKER_USER_KEY = "@health_app_lang_picker_completed_user_id";

export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
};

export const getLangPickerCompletedUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANG_PICKER_USER_KEY);
  } catch {
    return null;
  }
};

export const setLangPickerCompletedForUser = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANG_PICKER_USER_KEY, userId);
  } catch {}
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

/**
 * Applies the stored language preference.
 * If the user has not explicitly chosen a language yet, we stay with the
 * default `en` (set at init time) — device locale is NOT used.
 */
export const loadStoredLanguage = async (opts?: { isActive?: () => boolean }) => {
  const alive = () => opts?.isActive?.() !== false;

  const stored = await getStoredLanguage();
  if (!alive()) return;

  if (stored === "en" || stored === "tr") {
    await i18n.changeLanguage(stored);
  }
  // No stored value → keep the init default ("en"); do not auto-detect device locale.
};

export default i18n;
