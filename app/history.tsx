import { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput } from "react-native";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";

export default function EatingHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { meals, theme, updateMeal, deleteMeal } = useStore();
  const c = getThemeColors(theme);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingMealName, setEditingMealName] = useState("");

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

  const openEditModal = (mealId: string, currentName: string) => {
    setEditingMealId(mealId);
    setEditingMealName(currentName);
  };

  const closeEditModal = () => {
    setEditingMealId(null);
    setEditingMealName("");
  };

  const saveEdit = () => {
    if (!editingMealId) return;
    const trimmed = editingMealName.trim();
    if (!trimmed) return;
    updateMeal(editingMealId, trimmed);
    closeEditModal();
  };

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
                  <View className="flex-row items-center ml-2">
                    <Pressable onPress={() => openEditModal(meal.id, meal.name)} className="mr-3">
                      <Ionicons name="create-outline" size={20} color={c.iconSecondary} />
                    </Pressable>
                    <Pressable onPress={() => deleteMeal(meal.id)}>
                      <Ionicons name="trash-outline" size={20} color={c.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={editingMealId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable
          className="flex-1 items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={closeEditModal}
        >
          <Pressable
            onPress={() => { }}
            style={{ backgroundColor: c.surface, width: "100%", maxWidth: 420, borderRadius: 14, padding: 16 }}
          >
            <Text style={{ color: c.text }} className="text-base font-semibold mb-3">
              {t("history.editMeal")}
            </Text>
            <TextInput
              value={editingMealName}
              onChangeText={setEditingMealName}
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
              className="border rounded-xl px-4 h-12 text-base mb-4"
            />
            <View className="flex-row justify-end">
              <Pressable onPress={closeEditModal} className="px-4 py-2 mr-2">
                <Text style={{ color: c.textMuted }} className="font-medium">
                  {t("history.cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                style={{ backgroundColor: c.accent }}
                className="px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">{t("history.save")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaWrapper>
  );
}
