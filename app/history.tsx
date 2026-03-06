import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";

export default function EatingHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { meals, theme } = useStore();
  const c = getThemeColors(theme);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return t("common.today");
    if (d.toDateString() === yesterday.toDateString()) {
      return t("history.yesterday");
    }
    return d.toLocaleDateString(i18n.language === "tr" ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center px-4 py-3 border-b">
        <Pressable
          onPress={() => router.replace("/")}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color={c.accent} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: c.text }} className="text-lg font-bold">{t("history.title")}</Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 pb-8">
          <Text style={{ color: c.textSecondary }} className="mb-6">{t("history.description")}</Text>

          {meals.length === 0 ? (
            <View style={{ backgroundColor: c.surface }} className="rounded-xl p-8 items-center">
              <View style={{ backgroundColor: c.surfaceAlt }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons name="restaurant-outline" size={32} color={c.iconSecondary} />
              </View>
              <Text style={{ color: c.textSecondary }} className="text-center mb-1">
                {t("history.noMealsLogged")}
              </Text>
              <Text style={{ color: c.textMuted }} className="text-sm text-center">
                {t("history.scanOrAddFirst")}
              </Text>
            </View>
          ) : (
            <View>
              {meals.map((meal) => (
                <View
                  key={meal.id}
                  style={{ backgroundColor: c.surface }}
                  className="flex-row items-center rounded-xl p-4 mb-3"
                >
                  <View style={{ backgroundColor: c.accentMuted }} className="w-10 h-10 rounded-full items-center justify-center mr-3 shrink-0">
                    <Ionicons
                      name={meal.source === "scan" ? "camera" : "create"}
                      size={20}
                      color={c.accent}
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text style={{ color: c.text }} className="font-semibold" numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <Text style={{ color: c.textMuted }} className="text-sm" numberOfLines={1}>
                      {formatDate(meal.date)} • {meal.source === "scan" ? t("history.scanned") : t("history.manual")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
