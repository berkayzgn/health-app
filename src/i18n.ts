import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import tr from "./locales/tr.json";

const LANGUAGE_KEY = "@health_app_language";

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

export const loadStoredLanguage = async (opts?: { isActive?: () => boolean }) => {
  const alive = () => opts?.isActive?.() !== false;

  const stored = await getStoredLanguage();
  if (!alive()) return;

  if (stored && (stored === "en" || stored === "tr")) {
    await i18n.changeLanguage(stored);
    return;
  }

  if (!alive()) return;
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";
  const lang = deviceLocale.startsWith("tr") ? "tr" : "en";
  await i18n.changeLanguage(lang);
};

export default i18n;
