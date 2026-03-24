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
import { useStore } from "../../store/useStore";
import * as authService from "../../services/authService";
import { setStoredLanguage } from "../../i18n";

const NOTIFICATIONS_KEY = "@health_app_notifications";

function AccountManagementCard({
  displayName,
  tierLabel,
  onManageSubscription,
}: {
  displayName: string;
  tierLabel: string;
  onManageSubscription: () => void;
}) {
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
          <Text className="mt-1 font-label text-xs uppercase tracking-widest text-outline" numberOfLines={2}>
            {tierLabel}
          </Text>
          <Pressable
            onPress={onManageSubscription}
            className="mt-3 flex-row items-center self-start rounded-full bg-surface-container-low px-3 py-1.5 active:opacity-80"
          >
            <MaterialCommunityIcons name="crown-outline" size={16} color="#4e6300" />
            <Text
              className="ml-2 text-on-surface-variant text-xs"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {t("settings.manageSubscription")}
            </Text>
          </Pressable>
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

  const toggleLanguage = async () => {
    const next = i18n.language?.startsWith("tr") ? "en" : "tr";
    await i18n.changeLanguage(next);
    await setStoredLanguage(next);
  };

  const setNotifications = async (next: boolean) => {
    setNotificationsOn(next);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, next ? "1" : "0");
  };

  const languageSubtitle = i18n.language?.startsWith("tr")
    ? t("settings.languageValueTr")
    : t("settings.languageValueEn");

  const themeSubtitle =
    theme === "dark" ? t("settings.themeValueDark") : t("settings.themeValueLight");

  const deleteAccount = () => {
    Alert.alert(t("settings.deleteTitle"), t("settings.deleteMessage"));
  };

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  const displayName =
    authUser?.name?.trim() ||
    authUser?.email?.split("@")[0]?.trim() ||
    t("settings.accountGuest");

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader
            variant="inner"
            title={t("settings.title")}
            right={
              <Pressable onPress={comingSoon} hitSlop={8} className="p-2 -mr-2 rounded-full active:bg-on-primary-fixed/15">
                <MaterialCommunityIcons name="dots-vertical" size={20} color="#3a4a00" />
              </Pressable>
            }
          />

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
              <AccountManagementCard
                displayName={displayName}
                tierLabel={t("settings.accountTierPremium")}
                onManageSubscription={() => router.push("/subscription")}
              />

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
                  onPress={toggleLanguage}
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

              <SettingsSection title={t("settings.sectionPayment")}>
                <SettingsRow
                  icon="credit-card-outline"
                  title={t("settings.paymentMethod")}
                  subtitle={t("settings.paymentSubtitle")}
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

                <View className="items-center gap-1.5 px-1">
                  <Pressable onPress={deleteAccount}>
                    <Text className="text-outline text-xs font-label uppercase tracking-widest active:text-error">
                      {t("settings.deleteAccount")}
                    </Text>
                  </Pressable>
                  <Text className="text-[10px] text-outline-variant text-center leading-relaxed max-w-xs">
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
