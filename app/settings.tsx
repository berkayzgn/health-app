import { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import i18n, { setStoredLanguage } from "../i18n";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { theme, setTheme, notificationsEnabled, setNotificationsEnabled, clearAuth } = useStore();
  const c = getThemeColors(theme);

  const currentLanguageLabel =
    i18n.language === "tr" ? t("settings.turkish") : t("settings.english");

  const changeLanguage = async (lang: "en" | "tr") => {
    await i18n.changeLanguage(lang);
    await setStoredLanguage(lang);
    setLanguageModalVisible(false);
  };

  const handleLogOut = () => {
    clearAuth();
    router.replace("/auth");
  };

  const settingsSections = [
    {
      titleKey: "settings.general",
      items: [
        {
          icon: "notifications-outline",
          labelKey: "settings.notifications",
          type: "switch" as const,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          icon: theme === "dark" ? "moon" : "sunny-outline",
          labelKey: theme === "dark" ? "settings.darkMode" : "settings.lightMode",
          type: "switch" as const,
          value: theme === "dark",
          onToggle: (v: boolean) => setTheme(v ? "dark" : "light"),
        },
        {
          icon: "language-outline",
          labelKey: "settings.language",
          type: "link" as const,
          value: currentLanguageLabel,
          onPress: () => setLanguageModalVisible(true),
        },
      ],
    },
    {
      titleKey: "settings.support",
      items: [
        {
          icon: "document-text-outline",
          labelKey: "settings.privacyPolicy",
          type: "link" as const,
          onPress: () => { },
        },
        {
          icon: "mail-outline",
          labelKey: "settings.contactUs",
          type: "link" as const,
          onPress: () => { },
        },
      ],
    },
    {
      titleKey: "settings.account",
      items: [
        {
          icon: "log-out-outline",
          labelKey: "settings.logOut",
          type: "action" as const,
          onPress: handleLogOut,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center px-4 py-3 border-b">
        <Pressable
          onPress={() => router.replace("/")}
          className="flex-row items-center"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="arrow-back" size={24} color={c.accent} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: c.text }} className="text-lg font-bold">{t("settings.title")}</Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 pb-8">
          {settingsSections.map((section) => (
            <View key={section.titleKey} className="mb-6">
              <Text style={{ color: c.sectionTitle }} className="text-sm font-semibold uppercase tracking-wider mb-3 px-1">
                {t(section.titleKey)}
              </Text>
              <View style={{ backgroundColor: c.surface }} className="rounded-xl overflow-hidden">
                {section.items.map((item, index) => (
                  <Pressable
                    key={item.labelKey}
                    onPress={item.type === "link" || item.type === "action" ? item.onPress : undefined}
                    style={({ pressed }) => [
                      {
                        borderBottomWidth: index < section.items.length - 1 ? 1 : 0,
                        borderBottomColor: c.borderLight,
                      },
                      { opacity: pressed && (item.type === "link" || item.type === "action") ? 0.7 : 1 },
                    ]}
                    className="flex-row items-center justify-between px-4 py-4"
                  >
                    <View className="flex-row items-center flex-1 min-w-0 mr-2">
                      <Ionicons name={item.icon as any} size={22} color={c.iconMuted} />
                      <Text style={{ color: c.text }} className="text-base ml-3" numberOfLines={1}>
                        {t(item.labelKey)}
                      </Text>
                    </View>
                    <View className="flex-row items-center shrink-0">
                      {item.type === "switch" && (
                        <>
                          <Text style={{ color: c.textMuted }} className="text-sm mr-2">
                            {item.value ? t("settings.on") : t("settings.off")}
                          </Text>
                          <Switch
                            value={item.value}
                            onValueChange={item.onToggle}
                            trackColor={{ false: c.progressBg, true: "rgba(16, 183, 127, 0.5)" }}
                            thumbColor={item.value ? c.accent : c.surfaceAlt}
                          />
                        </>
                      )}
                      {(item.type === "link" || item.type === "action") && (
                        <>
                          {item.value ? (
                            <Text style={{ color: c.textMuted }} className="text-sm mr-2" numberOfLines={1}>
                              {item.value}
                            </Text>
                          ) : null}
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={item.type === "action" ? c.danger : c.iconSecondary}
                          />
                        </>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 }}
          onPress={() => setLanguageModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, width: "100%", maxWidth: 384 }}
            onPress={() => { }}
          >
            <Text style={{ color: c.text, fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
              {t("settings.language")}
            </Text>
            <Pressable
              onPress={() => changeLanguage("en")}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                marginBottom: 8,
                backgroundColor: i18n.language === "en" ? "rgba(16, 183, 127, 0.2)" : c.surfaceAlt,
              }}
            >
              <Text style={{ color: c.text, fontSize: 16, fontWeight: "500" }}>
                {t("settings.english")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => changeLanguage("tr")}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: i18n.language === "tr" ? "rgba(16, 183, 127, 0.2)" : c.surfaceAlt,
              }}
            >
              <Text style={{ color: c.text, fontSize: 16, fontWeight: "500" }}>
                {t("settings.turkish")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
