import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Alert } from "react-native";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";
import { updateProfile } from "../services/profileService";

const PREF_KEYS = [
  "balanced",
  "highProtein",
  "lowCarb",
  "keto",
  "vegetarian",
  "vegan",
  "glutenFree",
  "lowSodium",
] as const;

export default function DietPreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const c = getThemeColors(theme);
  const dietaryPreferences = useStore((s) => s.dietaryPreferences);
  const setDietaryPreferences = useStore((s) => s.setDietaryPreferences);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [localPreferences, setLocalPreferences] = useState<string[]>(dietaryPreferences);

  const selectedSet = useMemo(() => new Set(localPreferences), [localPreferences]);

  const toggle = (key: string) => {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setLocalPreferences(Array.from(next));
  };

  const save = async () => {
    try {
      await updateProfile({ dietaryPreferences: localPreferences });
      setDietaryPreferences(localPreferences);
      router.back();
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Kaydedilemedi");
    }
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center px-4 py-3 border-b">
        <Pressable onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back" size={24} color={c.accent} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: c.text }} className="text-lg font-bold">
            {t("profile.dietaryPreferences")}
          </Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={{ color: c.textMuted }} className="text-sm mb-3">
          {t("profile.dietaryPreferencesHint")}
        </Text>
        <Pressable
          onPress={() => setSheetVisible(true)}
          style={{ backgroundColor: c.surface, borderColor: c.border }}
          className="border rounded-xl px-4 py-4 mb-6 flex-row items-center justify-between"
        >
          <Text style={{ color: c.text }} className="text-base flex-1 mr-2" numberOfLines={1}>
            {localPreferences.length > 0
              ? localPreferences.map((key) => t(`profile.dietList.${key}`)).join(", ")
              : t("profile.noSelection")}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
        </Pressable>

        <Pressable
          onPress={save}
          style={{ backgroundColor: c.accent }}
          className="py-4 rounded-xl active:opacity-90"
        >
          <Text className="text-white font-semibold text-base text-center">
            {t("profile.save")}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={() => setSheetVisible(false)}>
          <Pressable
            onPress={() => { }}
            style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "60%" }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: c.text }} className="text-base font-semibold">
                {t("profile.dietaryPreferences")}
              </Text>
              <Pressable onPress={() => setSheetVisible(false)}>
                <Ionicons name="close" size={22} color={c.iconSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PREF_KEYS.map((key) => {
                const selected = selectedSet.has(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggle(key)}
                    style={{ borderColor: c.border }}
                    className="flex-row items-center justify-between py-3 border-b"
                  >
                    <Text style={{ color: c.text }} className="text-base">
                      {t(`profile.dietList.${key}`)}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={c.accent} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={22} color={c.iconSecondary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setSheetVisible(false)}
              style={{ backgroundColor: c.accent }}
              className="py-3 rounded-xl mt-4"
            >
              <Text className="text-white font-semibold text-center">{t("profile.save")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaWrapper>
  );
}
