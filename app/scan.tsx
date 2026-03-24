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
  Modal,
} from "react-native";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
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
  { id: "midSnack", labelKey: "scan.midSnack", icon: "fast-food-outline" },
];

interface FoodItem {
  id: string;
  name: string;
  portion: string;
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { addMeal, incrementScanCount, theme } = useStore();
  const c = getThemeColors(theme);
  const [activeMode, setActiveMode] = useState<"scan" | "input">("input");
  const [mealType, setMealType] = useState("lunch");
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftPortion, setDraftPortion] = useState("");
  const [mealTypeSheetVisible, setMealTypeSheetVisible] = useState(false);
  const [addItemFormVisible, setAddItemFormVisible] = useState(false);

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

  const handleManualSubmit = () => {
    if (foodItems.length === 0) return;
    const displayName = foodItems
      .map((item) =>
        item.portion ? `${item.name} (${item.portion})` : item.name
      )
      .join(", ");

    addMeal(displayName, "manual");
    router.push({
      pathname: "/meal-description",
      params: { meal: displayName, source: "manual" },
    });

    setFoodItems([]);
    setDraftName("");
    setDraftPortion("");
  };

  const addFoodItem = () => {
    const trimmed = draftName.trim();
    const trimmedPortion = draftPortion.trim();
    if (!trimmed || !trimmedPortion) return;
    setFoodItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: trimmed,
        portion: trimmedPortion,
      },
    ]);
    setDraftName("");
    setDraftPortion("");
  };

  const removeFoodItem = (id: string) => {
    setFoodItems((prev) => prev.filter((item) => item.id !== id));
  };

  const canSubmit = foodItems.length > 0;
  const selectedMealType =
    MEAL_TYPES.find((type) => type.id === mealType) ?? MEAL_TYPES[1];

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
              <Pressable
                onPress={() => setMealTypeSheetVisible(true)}
                style={{ backgroundColor: c.surface, borderColor: c.border }}
                className="border rounded-xl px-4 py-4 mb-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 min-w-0">
                  <Ionicons name={selectedMealType.icon as any} size={18} color={c.iconMuted} />
                  <Text style={{ color: c.text }} className="ml-2 font-medium text-sm" numberOfLines={1}>
                    {t(selectedMealType.labelKey)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
              </Pressable>

              <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
                {t("scan.whatDidYouEat")}
              </Text>
              <Pressable
                onPress={() => setAddItemFormVisible((prev) => !prev)}
                style={{ backgroundColor: c.surface, borderColor: c.border }}
                className="border rounded-xl px-4 py-4 mb-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="add-circle-outline" size={20} color={c.accent} />
                  <Text style={{ color: c.text }} className="ml-2 text-sm font-medium">
                    {t("scan.addFoodItem")}
                  </Text>
                </View>
                <Ionicons
                  name={addItemFormVisible ? "chevron-up" : "chevron-forward"}
                  size={20}
                  color={c.iconSecondary}
                />
              </Pressable>

              {addItemFormVisible ? (
                <View
                  style={{ backgroundColor: c.surface, borderColor: c.border }}
                  className="border rounded-xl p-4 mb-4"
                >
                  <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
                    {t("scan.whatDidYouEat")}
                  </Text>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder={t("scan.foodPlaceholder")}
                    placeholderTextColor={c.placeholder}
                    style={{
                      backgroundColor: c.surfaceAlt,
                      borderColor: c.border,
                      color: c.text,
                      textAlignVertical: "center",
                      includeFontPadding: false,
                      paddingVertical: 0,
                      lineHeight: 20,
                    }}
                    className="border rounded-xl px-4 h-14 text-base mb-4"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />

                  <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
                    {t("scan.portion")}
                  </Text>
                  <TextInput
                    value={draftPortion}
                    onChangeText={setDraftPortion}
                    placeholder={t("scan.portionPlaceholder")}
                    placeholderTextColor={c.placeholder}
                    style={{
                      backgroundColor: c.surfaceAlt,
                      borderColor: c.border,
                      color: c.text,
                      textAlignVertical: "center",
                      includeFontPadding: false,
                      paddingVertical: 0,
                      lineHeight: 20,
                    }}
                    className="border rounded-xl px-4 h-14 text-base mb-4"
                    autoCapitalize="none"
                  />

                  <Pressable
                    onPress={addFoodItem}
                    disabled={
                      draftName.trim().length === 0 ||
                      draftPortion.trim().length === 0
                    }
                    style={{
                      backgroundColor:
                        draftName.trim().length > 0 &&
                        draftPortion.trim().length > 0
                          ? c.accent
                          : c.surfaceAlt,
                    }}
                    className="py-3 rounded-xl"
                  >
                    <Text
                      style={{
                        color:
                          draftName.trim().length > 0 &&
                          draftPortion.trim().length > 0
                            ? "white"
                            : c.textMuted,
                      }}
                      className="font-semibold text-center"
                    >
                      {t("scan.addItem")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {foodItems.length > 0 ? (
                <View className="mb-4">
                  {foodItems.map((item) => (
                    <View
                      key={item.id}
                      style={{ backgroundColor: c.surface, borderColor: c.border }}
                      className="border rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
                    >
                      <View className="flex-1 min-w-0 mr-2">
                        <Text style={{ color: c.text }} className="text-sm font-semibold" numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.portion ? (
                          <Text style={{ color: c.textMuted }} className="text-xs mt-0.5" numberOfLines={1}>
                            {item.portion}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable onPress={() => removeFoodItem(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={c.danger} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: c.textMuted }} className="text-xs mb-4">
                  {t("scan.noItemsAdded")}
                </Text>
              )}

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

      <Modal visible={mealTypeSheetVisible} transparent animationType="slide" onRequestClose={() => setMealTypeSheetVisible(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={() => setMealTypeSheetVisible(false)}>
          <Pressable onPress={() => { }} style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "60%" }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: c.text }} className="text-base font-semibold">{t("scan.mealType")}</Text>
              <Pressable onPress={() => setMealTypeSheetVisible(false)}>
                <Ionicons name="close" size={22} color={c.iconSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MEAL_TYPES.map((type) => {
                const selected = mealType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => setMealType(type.id)}
                    style={{ borderColor: c.border }}
                    className="flex-row items-center justify-between py-3 border-b"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name={type.icon as any} size={18} color={c.iconMuted} />
                      <Text style={{ color: c.text }} className="text-base ml-2">{t(type.labelKey)}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={c.accent} /> : <Ionicons name="ellipse-outline" size={22} color={c.iconSecondary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaWrapper>
  );
}
