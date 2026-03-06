import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";

const MEAL_TYPES = [
  { id: "breakfast", labelKey: "scan.breakfast", icon: "sunny-outline" },
  { id: "lunch", labelKey: "scan.lunch", icon: "restaurant-outline" },
  { id: "dinner", labelKey: "scan.dinner", icon: "moon-outline" },
  { id: "snack", labelKey: "scan.snack", icon: "cafe-outline" },
];

const QUICK_SUGGESTION_KEYS = [
  "scan.quickSuggestions.grilledChicken",
  "scan.quickSuggestions.oatmeal",
  "scan.quickSuggestions.turkeySandwich",
  "scan.quickSuggestions.greekYogurt",
  "scan.quickSuggestions.riceVegetables",
  "scan.quickSuggestions.eggsToast",
] as const;

export default function ScanScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { addMeal, incrementScanCount, theme } = useStore();
  const c = getThemeColors(theme);
  const [activeMode, setActiveMode] = useState<"scan" | "input">("input");
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [portion, setPortion] = useState("");

  const cameraSize = Math.min(width - 32, 360);

  const handleScan = () => {
    incrementScanCount();
    const scannedMeal = "Scanned Meal";
    addMeal(scannedMeal, "scan");
    router.push({
      pathname: "/meal-description",
      params: { meal: scannedMeal, source: "scan" },
    });
  };

  const handleSuggestionPress = (suggestion: string) => {
    setMealName(suggestion);
  };

  const handleManualSubmit = () => {
    const trimmed = mealName.trim();
    if (!trimmed) return;

    const displayName = portion.trim()
      ? `${trimmed} (${portion.trim()})`
      : trimmed;

    addMeal(displayName, "manual");
    router.push({
      pathname: "/meal-description",
      params: { meal: displayName, source: "manual" },
    });

    setMealName("");
    setPortion("");
  };

  const canSubmit = mealName.trim().length > 0;

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
          <Text style={{ color: c.text }} className="text-lg font-bold">{t("scan.title")}</Text>
        </View>
        <View className="w-8" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 p-4">
          <View style={{ backgroundColor: c.surfaceAlt }} className="flex-row rounded-xl p-1 mb-4">
            <Pressable
              onPress={() => setActiveMode("scan")}
              style={{ backgroundColor: activeMode === "scan" ? c.surface : "transparent" }}
              className="flex-1 flex-row items-center justify-center py-3 rounded-lg"
            >
              <Ionicons
                name="camera"
                size={20}
                color={activeMode === "scan" ? c.accent : c.iconMuted}
              />
              <Text
                style={{ color: activeMode === "scan" ? c.accent : c.textMuted }}
                className="font-semibold ml-2 text-sm"
              >
                {t("scan.scan")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveMode("input")}
              style={{ backgroundColor: activeMode === "input" ? c.surface : "transparent" }}
              className="flex-1 flex-row items-center justify-center py-3 rounded-lg"
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={activeMode === "input" ? c.accent : c.iconMuted}
              />
              <Text
                style={{ color: activeMode === "input" ? c.accent : c.textMuted }}
                className="font-semibold ml-2 text-sm"
              >
                {t("scan.input")}
              </Text>
            </Pressable>
          </View>

          {activeMode === "scan" ? (
            <View className="flex-1 items-center justify-center">
              <View
                style={{
                  width: cameraSize,
                  aspectRatio: 1,
                  backgroundColor: c.surfaceAlt,
                  borderColor: c.border,
                }}
                className="rounded-2xl items-center justify-center border-2 border-dashed mb-4"
              >
                <Ionicons name="camera-outline" size={48} color={c.iconSecondary} />
                <Text style={{ color: c.textMuted }} className="mt-2 text-center px-4 text-sm">
                  {t("scan.pointCameraToScan")}
                </Text>
              </View>
              <Pressable
                onPress={handleScan}
                style={{ backgroundColor: c.accent }}
                className="px-6 py-3 rounded-xl active:opacity-90"
              >
                <Text className="text-white font-semibold text-base">
                  {t("scan.scanMeal")}
                </Text>
              </Pressable>
              <Text style={{ color: c.textMuted }} className="text-xs mt-3">
                {t("scan.cameraComingSoon")}
              </Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
                {t("scan.mealType")}
              </Text>
              <View className="flex-row flex-wrap mb-4">
                {MEAL_TYPES.map((type) => (
                  <Pressable
                    key={type.id}
                    onPress={() => setMealType(type.id)}
                    style={{
                      backgroundColor: mealType === type.id ? c.accent : c.surface,
                    }}
                    className="flex-row items-center px-4 py-2.5 rounded-xl mr-2 mb-2"
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={18}
                      color={mealType === type.id ? "white" : c.iconMuted}
                    />
                    <Text
                      style={{ color: mealType === type.id ? "white" : c.textSecondary }}
                      className="ml-2 font-medium text-sm"
                    >
                      {t(type.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
                {t("scan.whatDidYouEat")}
              </Text>
              <TextInput
                value={mealName}
                onChangeText={setMealName}
                placeholder={t("scan.foodPlaceholder")}
                placeholderTextColor={c.placeholder}
                style={{ backgroundColor: c.surface, borderColor: c.border, color: c.text }}
                className="border rounded-xl px-4 py-4 text-base mb-4"
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
                {t("scan.portion")} <Text style={{ color: c.textMuted }} className="font-normal">{t("scan.portionOptional")}</Text>
              </Text>
              <TextInput
                value={portion}
                onChangeText={setPortion}
                placeholder={t("scan.portionPlaceholder")}
                placeholderTextColor={c.placeholder}
                style={{ backgroundColor: c.surface, borderColor: c.border, color: c.text }}
                className="border rounded-xl px-4 py-4 text-base mb-4"
                autoCapitalize="none"
              />

              <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
                {t("scan.quickAdd")}
              </Text>
              <View className="flex-row flex-wrap mb-6">
                {QUICK_SUGGESTION_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => handleSuggestionPress(t(key))}
                    style={{ backgroundColor: c.surface, borderColor: c.border }}
                    className="border rounded-lg px-3 py-2 mr-2 mb-2"
                  >
                    <Text style={{ color: c.textSecondary }} className="text-sm">{t(key)}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleManualSubmit}
                disabled={!canSubmit}
                style={{ backgroundColor: canSubmit ? c.accent : c.surfaceAlt }}
                className="py-4 rounded-xl active:opacity-90"
              >
                <Text
                  style={{ color: canSubmit ? "white" : c.textMuted }}
                  className="font-semibold text-base text-center"
                >
                  {t("scan.addMeal")}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
