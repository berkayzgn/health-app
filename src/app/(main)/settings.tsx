import type { ComponentProps, ReactNode } from "react";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import Constants from "expo-constants";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import NavIconButton from "../../components/NavIconButton";
import { useStore } from "../../store/useStore";
import * as authService from "../../services/authService";
import { setStoredLanguage } from "../../i18n";

const NOTIFICATIONS_KEY = "@health_app_notifications";

function AccountSummaryCard({ displayName, email }: { displayName: string; email?: string | null }) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <Text className="font-label text-[10px] uppercase tracking-[0.12em] font-bold text-outline px-1">
        {t("settings.accountManagement")}
      </Text>
      <View className="relative overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest px-4 py-4">
        <View className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary-container/15" pointerEvents="none" />
        <View className="relative z-10">
          <Text
            className="text-on-surface text-lg leading-6"
            style={{ fontFamily: "Manrope_700Bold" }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {email ? (
            <Text
              className="mt-1 text-sm text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
              numberOfLines={2}
            >
              {email}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-label text-[10px] uppercase tracking-[0.12em] font-bold text-outline px-1">
        {title}
      </Text>
      <View className="bg-surface-container-lowest rounded-xl border border-surface-container overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function SettingsSwitchRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  showBottomBorder,
  theme,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  showBottomBorder?: boolean;
  theme: "light" | "dark";
}) {
  const trackOff = theme === "dark" ? "#3a3b35" : "#dbdddd";
  const trackOn = "#cafd00";
  return (
    <View
      className={`w-full flex-row items-center py-2.5 pl-3 pr-3 ${
        showBottomBorder ? "border-b border-surface-container" : ""
      }`}
    >
      <MaterialCommunityIcons name={icon} size={22} color="#767777" style={{ marginTop: 1 }} />
      <View className="flex-1 min-w-0 ml-3 pr-2">
        <Text
          className="text-on-surface text-[15px] leading-5"
          style={{ fontFamily: "Inter_600SemiBold" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-[11px] text-on-surface-variant mt-0.5 leading-4" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: trackOff, true: trackOn }}
        thumbColor={Platform.OS === "android" ? (value ? "#3a4a00" : "#f4f4f5") : undefined}
        ios_backgroundColor={trackOff}
      />
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  showBottomBorder,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle: string;
  onPress?: () => void;
  showBottomBorder?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-full flex-row items-center py-2.5 pl-3 pr-2 active:bg-surface-container-low/80 ${
        showBottomBorder ? "border-b border-surface-container" : ""
      }`}
    >
      <MaterialCommunityIcons name={icon} size={20} color="#767777" style={{ marginTop: 1 }} />
      <View className="flex-1 min-w-0 ml-3 pr-2">
        <Text
          className="text-on-surface text-[15px] leading-5"
          style={{ fontFamily: "Inter_600SemiBold" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-[11px] text-on-surface-variant mt-0.5 leading-4" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#acadad" />
    </Pressable>
  );
}

function LanguageBottomSheet({
  visible,
  currentLang,
  onClose,
  onSelectLang,
}: {
  visible: boolean;
  currentLang: "en" | "tr";
  onClose: () => void;
  onSelectLang: (lang: "en" | "tr") => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          onPress={onClose}
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        />
        <View
          className="rounded-t-[1.25rem] border border-b-0 border-surface-container bg-surface-container-lowest px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <View className="flex-row items-center">
            <View className="h-10 w-10" />
            <View className="flex-1 items-center">
              <View className="h-1 w-10 rounded-full bg-outline-variant" />
            </View>
            <NavIconButton
              variant="surface"
              icon="close"
              onPress={onClose}
              accessibilityLabel={t("settings.languageSheetClose")}
              iconSize={22}
            />
          </View>
          <Text
            className="mt-4 text-on-surface text-lg leading-6"
            style={{ fontFamily: "Manrope_700Bold" }}
          >
            {t("settings.languageSheetTitle")}
          </Text>
          <Text
            className="mt-1 text-[13px] leading-5 text-on-surface-variant"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("settings.languageSheetHint")}
          </Text>

          <View className="mt-5 overflow-hidden rounded-xl border border-surface-container">
            <Pressable
              onPress={() => void onSelectLang("tr")}
              className={`flex-row items-center border-b border-surface-container px-4 py-3.5 active:bg-surface-container-low/80 ${
                currentLang === "tr" ? "bg-primary-container/20" : "bg-surface-container-lowest"
              }`}
            >
              <MaterialCommunityIcons
                name={currentLang === "tr" ? "radiobox-marked" : "radiobox-blank"}
                size={22}
                color={currentLang === "tr" ? "#4e6300" : "#acadad"}
              />
              <Text
                className="ml-3 flex-1 text-on-surface text-[15px]"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {t("settings.languageValueTr")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void onSelectLang("en")}
              className={`flex-row items-center px-4 py-3.5 active:bg-surface-container-low/80 ${
                currentLang === "en" ? "bg-primary-container/20" : "bg-surface-container-lowest"
              }`}
            >
              <MaterialCommunityIcons
                name={currentLang === "en" ? "radiobox-marked" : "radiobox-blank"}
                size={22}
                color={currentLang === "en" ? "#4e6300" : "#acadad"}
              />
              <Text
                className="ml-3 flex-1 text-on-surface text-[15px]"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {t("settings.languageValueEn")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearAuth = useStore((s) => s.clearAuth);
  const authUser = useStore((s) => s.authUser);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const [signingOut, setSigningOut] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_KEY).then((v) => {
      if (v === "0") setNotificationsOn(false);
      else if (v === "1") setNotificationsOn(true);
    });
  }, []);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const comingSoon = () => Alert.alert(t("auth.comingSoon"));

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authService.logout();
      clearAuth();
      router.replace("/auth");
    } finally {
      setSigningOut(false);
    }
  };

  const executeAccountDeletion = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      await authService.deleteAccount();
      clearAuth();
      router.replace("/auth");
    } catch {
      Alert.alert(t("auth.errorTitle"), t("settings.deleteFailed"));
    } finally {
      setDeletingAccount(false);
    }
  };

  const promptDeleteAccount = () => {
    if (deletingAccount) return;
    // iOS: Alert from ScrollView onPress is unreliable without deferring (RN touch pipeline).
    setTimeout(() => {
      Alert.alert(t("settings.deleteSecondTitle"), t("settings.deleteSecondMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.deleteYes"),
          style: "destructive",
          onPress: () => {
            void executeAccountDeletion();
          },
        },
      ]);
    }, 0);
  };

  const applyLanguage = async (lang: "en" | "tr") => {
    await i18n.changeLanguage(lang);
    await setStoredLanguage(lang);
    setLanguageSheetVisible(false);
  };

  const setNotifications = async (next: boolean) => {
    setNotificationsOn(next);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, next ? "1" : "0");
  };

  const languageSubtitle = i18n.language?.startsWith("tr")
    ? t("settings.languageValueTr")
    : t("settings.languageValueEn");

  const languageCode: "en" | "tr" = i18n.language?.startsWith("tr") ? "tr" : "en";

  const themeSubtitle =
    theme === "dark" ? t("settings.themeValueDark") : t("settings.themeValueLight");

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  const displayName =
    authUser?.name?.trim() ||
    authUser?.email?.split("@")[0]?.trim() ||
    t("settings.accountGuest");

  return (
    <View className="flex-1 bg-surface">
      <LanguageBottomSheet
        visible={languageSheetVisible}
        currentLang={languageCode}
        onClose={() => setLanguageSheetVisible(false)}
        onSelectLang={applyLanguage}
      />
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="inner" title={t("settings.title")} />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 20),
              maxWidth: 400,
              width: "100%",
              alignSelf: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-5">
              <AccountSummaryCard displayName={displayName} email={authUser?.email} />

              <SettingsSection title={t("settings.sectionPreferences")}>
                <SettingsSwitchRow
                  theme={theme}
                  icon="weather-night"
                  title={t("settings.theme")}
                  subtitle={themeSubtitle}
                  value={theme === "dark"}
                  onValueChange={(v) => setTheme(v ? "dark" : "light")}
                  showBottomBorder
                />
                <SettingsSwitchRow
                  theme={theme}
                  icon="bell-outline"
                  title={t("settings.notifications")}
                  subtitle={
                    notificationsOn
                      ? t("settings.notificationsSubtitle")
                      : t("settings.notificationsOffSubtitle")
                  }
                  value={notificationsOn}
                  onValueChange={setNotifications}
                  showBottomBorder
                />
                <SettingsRow
                  icon="translate"
                  title={t("settings.language")}
                  subtitle={languageSubtitle}
                  onPress={() => setLanguageSheetVisible(true)}
                />
              </SettingsSection>

              <SettingsSection title={t("settings.sectionSupport")}>
                <SettingsRow
                  icon="information-outline"
                  title={t("settings.about")}
                  subtitle={t("settings.aboutSubtitle", { version: appVersion })}
                  onPress={comingSoon}
                  showBottomBorder
                />
                <SettingsRow
                  icon="shield-check-outline"
                  title={t("settings.securityLegal")}
                  subtitle={t("settings.securitySubtitle")}
                  onPress={comingSoon}
                  showBottomBorder
                />
                <SettingsRow
                  icon="message-outline"
                  title={t("settings.contact")}
                  subtitle={t("settings.contactSubtitle")}
                  onPress={comingSoon}
                />
              </SettingsSection>

              <View className="gap-4 pt-1">
                <Pressable
                  onPress={signOut}
                  disabled={signingOut}
                  className="h-14 w-full flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed active:opacity-90"
                  style={{ opacity: signingOut ? 0.55 : 1 }}
                >
                  {signingOut ? (
                    <ActivityIndicator color="#3a4a00" />
                  ) : (
                    <>
                      <Text
                        className="text-lg font-bold text-on-primary-fixed"
                        style={{ fontFamily: "Manrope_700Bold" }}
                      >
                        {t("auth.logout")}
                      </Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#3a4a00" />
                    </>
                  )}
                </Pressable>

                <View className="gap-2">
                  <Pressable
                    onPress={promptDeleteAccount}
                    disabled={deletingAccount}
                    accessibilityRole="button"
                    accessibilityLabel={t("settings.deleteAccount")}
                    hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                    className="min-h-[48px] w-full items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-3.5 active:bg-surface-container-low"
                    style={{ opacity: deletingAccount ? 0.5 : 1 }}
                  >
                    <Text
                      className="text-xs font-label uppercase tracking-widest text-error"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("settings.deleteAccount")}
                    </Text>
                  </Pressable>
                  <Text className="text-[10px] text-outline-variant text-center leading-relaxed px-1">
                    {t("settings.deleteDisclaimer")}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
