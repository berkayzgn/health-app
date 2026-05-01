import type { ReactNode } from "react";
import { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
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

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4">
      <Text className="font-label text-[10px] uppercase tracking-[0.15em] font-bold text-outline px-2">
        {title}
      </Text>
      <View className="bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function SettingsNavRow({
  icon,
  title,
  subtitle,
  onPress,
  showBottomBorder,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  showBottomBorder?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-full flex-row items-center justify-between p-6 active:bg-surface-container-low ${
        showBottomBorder ? "border-b border-surface-container-low" : ""
      }`}
    >
      <View className="flex-row items-center gap-5 flex-1 min-w-0 pr-2">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-low">
          <MaterialIcons name={icon} size={22} color="#4e6300" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-on-surface font-bold" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-xs text-on-surface-variant mt-1" style={{ fontFamily: "Inter_400Regular" }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#acadad" />
    </Pressable>
  );
}

/** Açık / kapalı için satır içi anahtar; sol metne dokunarak da değişir. */
function SettingsSwitchRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  showBottomBorder,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void | Promise<void>;
  showBottomBorder?: boolean;
}) {
  const flip = () => void onValueChange(!value);

  return (
    <View
      className={`w-full flex-row items-center justify-between p-6 ${
        showBottomBorder ? "border-b border-surface-container-low" : ""
      }`}
    >
      <Pressable
        onPress={flip}
        className="flex-row items-center gap-5 flex-1 min-w-0 pr-4 active:bg-surface-container-low/80 rounded-2xl -m-2 p-2"
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-low">
          <MaterialIcons name={icon} size={22} color="#4e6300" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-on-surface font-bold" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-xs text-on-surface-variant mt-1" style={{ fontFamily: "Inter_400Regular" }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityRole="switch"
        trackColor={{ false: "#cfd2d6", true: "#9eb355" }}
        thumbColor="#f6f8f9"
        ios_backgroundColor="#cfd2d6"
      />
    </View>
  );
}

function ProfileGlimpseCard({
  displayName,
  memberLabel,
  onManageSubscription,
}: {
  displayName: string;
  memberLabel: string;
  onManageSubscription: () => void;
}) {
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "L";
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "H";
    return `${a}${b}`.toUpperCase();
  }, [displayName]);

  return (
    <View className="relative overflow-hidden bg-surface-container-lowest rounded-3xl p-8 shadow-sm flex-row items-center gap-6">
      <View className="relative">
        <View className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary-container bg-surface-container-low items-center justify-center">
          <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
            {initials}
          </Text>
        </View>
        <View className="absolute -bottom-1 -right-1 bg-primary text-on-primary p-1.5 rounded-full border-2 border-surface-container-lowest">
          <MaterialIcons name="verified" size={16} color="#e1ff88" />
        </View>
      </View>

      <View className="flex-1 min-w-0">
        <Text className="text-xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }} numberOfLines={1}>
          {displayName}
        </Text>
        <Text className="text-sm uppercase tracking-widest text-outline mt-1" style={{ fontFamily: "Inter_500Medium" }} numberOfLines={1}>
          {memberLabel}
        </Text>

        <Pressable onPress={onManageSubscription} className="mt-4 self-start active:opacity-80">
          <View className="flex-row items-center rounded-full bg-surface-container-low px-4 py-2">
            <MaterialIcons name="workspace-premium" size={18} color="#4e6300" />
            <Text className="ml-2 text-xs font-semibold text-on-surface-variant" style={{ fontFamily: "Inter_600SemiBold" }}>
              Manage Subscription
            </Text>
          </View>
        </Pressable>
      </View>

      <View
        pointerEvents="none"
        style={{ position: "absolute", right: -48, top: -48, width: 192, height: 192, borderRadius: 9999, backgroundColor: "rgba(202,253,0,0.20)" }}
      />
    </View>
  );
}

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
              <MaterialIcons
                name={currentLang === "tr" ? "radio-button-checked" : "radio-button-unchecked"}
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
              <MaterialIcons
                name={currentLang === "en" ? "radio-button-checked" : "radio-button-unchecked"}
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
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 28),
              maxWidth: 720,
              width: "100%",
              alignSelf: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-8">
              <ProfileGlimpseCard
                displayName={displayName}
                memberLabel={t("settings.memberBadge")}
                onManageSubscription={() => router.push("/payment")}
              />

              <SettingsSection title={t("settings.sectionAccountBilling")}>
                <SettingsNavRow
                  icon="credit-card"
                  title={t("settings.payment")}
                  subtitle={t("settings.paymentSubtitle")}
                  onPress={() => router.push("/payment")}
                  showBottomBorder
                />
                <SettingsNavRow
                  icon="language"
                  title={t("settings.language")}
                  subtitle={languageSubtitle}
                  onPress={() => setLanguageSheetVisible(true)}
                />
              </SettingsSection>

              <SettingsSection title={t("settings.sectionAppSettings")}>
                <SettingsSwitchRow
                  icon="notifications"
                  title={t("settings.notifications")}
                  subtitle={
                    notificationsOn ? t("settings.notificationsSubtitle") : t("settings.notificationsOffSubtitle")
                  }
                  value={notificationsOn}
                  onValueChange={(v) => void setNotifications(v)}
                  showBottomBorder
                />
                <SettingsSwitchRow
                  icon="dark-mode"
                  title={t("settings.theme")}
                  subtitle={themeSubtitle}
                  value={theme === "dark"}
                  onValueChange={(dark) => setTheme(dark ? "dark" : "light")}
                />
              </SettingsSection>

              <SettingsSection title={t("settings.sectionSupport")}>
                <SettingsNavRow
                  icon="info"
                  title={t("settings.about")}
                  subtitle={t("settings.aboutSubtitle", { version: appVersion })}
                  onPress={comingSoon}
                  showBottomBorder
                />
                <SettingsNavRow
                  icon="shield"
                  title={t("settings.securityLegal")}
                  subtitle={t("settings.securitySubtitle")}
                  onPress={comingSoon}
                  showBottomBorder
                />
                <SettingsNavRow
                  icon="chat"
                  title={t("settings.contact")}
                  subtitle={t("settings.contactSubtitle")}
                  onPress={comingSoon}
                />
              </SettingsSection>

              <View className="gap-6 pt-1">
                <Pressable
                  onPress={signOut}
                  disabled={signingOut}
                  className="w-full py-5 rounded-3xl bg-surface-container-lowest active:opacity-90 flex-row items-center justify-center gap-3"
                  style={{ opacity: signingOut ? 0.55 : 1 }}
                >
                  {signingOut ? (
                    <ActivityIndicator color="#b02500" />
                  ) : (
                    <>
                      <MaterialIcons name="logout" size={22} color="#b02500" />
                      <Text className="text-lg text-error" style={{ fontFamily: "Manrope_800ExtraBold" }}>
                        {t("auth.logout")}
                      </Text>
                    </>
                  )}
                </Pressable>

                <View className="items-center gap-2">
                  <Pressable
                    onPress={promptDeleteAccount}
                    disabled={deletingAccount}
                    className="active:opacity-80"
                    hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
                  >
                    <Text className="text-outline text-xs uppercase tracking-widest" style={{ fontFamily: "Inter_600SemiBold" }}>
                      {t("settings.deleteAccount")}
                    </Text>
                  </Pressable>
                  <Text className="text-[10px] text-outline-variant text-center leading-relaxed px-6" style={{ fontFamily: "Inter_400Regular" }}>
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
