import { View, Text, ScrollView, Pressable } from "react-native";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";

export default function MealDescriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const c = getThemeColors(theme);
  const { meal, source } = useLocalSearchParams<{
    meal: string;
    source?: string;
  }>();

  const mealName = meal || t("mealDescription.unknownMeal");
  const isFromScan = source === "scan";

  return (
    <SafeAreaWrapper style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center px-4 py-3 border-b">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color={c.accent} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: c.text }} className="text-lg font-bold">{t("mealDescription.title")}</Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 pb-8">
          <View className="flex-row items-center mb-6">
            <View style={{ backgroundColor: c.accentMuted }} className="w-14 h-14 rounded-full items-center justify-center shrink-0">
              <Ionicons
                name={isFromScan ? "camera" : "create"}
                size={28}
                color={c.accent}
              />
            </View>
            <View className="flex-1 min-w-0 ml-3">
              <Text style={{ color: c.text }} className="text-xl font-bold" numberOfLines={2}>
                {mealName}
              </Text>
              <Text style={{ color: c.textMuted }} className="text-sm">
                {isFromScan ? t("mealDescription.scanned") : t("mealDescription.manualEntry")}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: c.surfaceAlt }} className="rounded-xl p-4 mb-4">
            <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
              {t("mealDescription.nutritionalInfo")}
            </Text>
            <Text style={{ color: c.textSecondary }} className="leading-relaxed">
              {t("mealDescription.nutritionalInfoDesc")}
            </Text>
          </View>

          <View style={{ backgroundColor: c.surfaceAlt }} className="rounded-xl p-4 mb-4">
            <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
              {t("mealDescription.caloriesMacros")}
            </Text>
            <View className="flex-row flex-wrap -mx-1.5">
              <View className="flex-1 px-1.5 mb-3" style={{ minWidth: "45%" }}>
                <View style={{ backgroundColor: c.surface }} className="rounded-lg p-3">
                  <Text style={{ color: c.accent }} className="text-xl font-bold">--</Text>
                  <Text style={{ color: c.textMuted }} className="text-xs">{t("mealDescription.calories")}</Text>
                </View>
              </View>
              <View className="flex-1 px-1.5 mb-3" style={{ minWidth: "45%" }}>
                <View style={{ backgroundColor: c.surface }} className="rounded-lg p-3">
                  <Text style={{ color: c.accent }} className="text-xl font-bold">--</Text>
                  <Text style={{ color: c.textMuted }} className="text-xs">{t("mealDescription.proteinG")}</Text>
                </View>
              </View>
              <View className="flex-1 px-1.5 mb-3" style={{ minWidth: "45%" }}>
                <View style={{ backgroundColor: c.surface }} className="rounded-lg p-3">
                  <Text style={{ color: c.accent }} className="text-xl font-bold">--</Text>
                  <Text style={{ color: c.textMuted }} className="text-xs">{t("mealDescription.carbsG")}</Text>
                </View>
              </View>
              <View className="flex-1 px-1.5 mb-3" style={{ minWidth: "45%" }}>
                <View style={{ backgroundColor: c.surface }} className="rounded-lg p-3">
                  <Text style={{ color: c.accent }} className="text-xl font-bold">--</Text>
                  <Text style={{ color: c.textMuted }} className="text-xs">{t("mealDescription.fatG")}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: c.surfaceAlt }} className="rounded-xl p-4">
            <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
              {t("mealDescription.dietaryTags")}
            </Text>
            <Text style={{ color: c.textMuted }} className="text-sm">
              {t("mealDescription.dietaryTagsDesc")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
