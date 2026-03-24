import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Modal, Alert } from "react-native";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore, type ConditionType } from "../store/useStore";
import { getThemeColors } from "../theme";
import { updateProfile } from "../services/profileService";

const CONDITION_OPTIONS: ConditionType[] = [
  "none",
  "celiac",
  "diabetes",
  "cholesterol",
  "hypertension",
  "thyroid",
  "ibs",
];

export default function PersonalInfoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const c = getThemeColors(theme);

  const storedHeight = useStore((s) => s.heightCm);
  const storedWeight = useStore((s) => s.weightKg);
  const storedConditionTypes = useStore((s) => s.conditionTypes);
  const setPersonalInfo = useStore((s) => s.setPersonalInfo);

  const [heightCm, setHeightCm] = useState(storedHeight);
  const [weightKg, setWeightKg] = useState(storedWeight);
  const [conditionTypes, setConditionTypes] = useState<ConditionType[]>(storedConditionTypes);
  const [sheetVisible, setSheetVisible] = useState(false);

  const save = async () => {
    const payload = {
      heightCm: heightCm.trim(),
      weightKg: weightKg.trim(),
      conditionTypes,
    };
    try {
      await updateProfile(payload);
      setPersonalInfo(payload);
      router.back();
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Kaydedilemedi");
    }
  };

  const toggleCondition = (type: ConditionType) => {
    if (type === "none") {
      setConditionTypes(["none"]);
      return;
    }

    const next = conditionTypes.includes(type)
      ? conditionTypes.filter((v) => v !== type)
      : [...conditionTypes.filter((v) => v !== "none"), type];

    setConditionTypes(next.length > 0 ? next : ["none"]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center px-4 py-3 border-b">
        <Pressable onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back" size={24} color={c.accent} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: c.text }} className="text-lg font-bold">
            {t("profile.personalInfo")}
          </Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
          {t("profile.height")}
        </Text>
        <TextInput
          value={heightCm}
          onChangeText={setHeightCm}
          placeholder={t("profile.heightPlaceholder")}
          placeholderTextColor={c.placeholder}
          keyboardType="number-pad"
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            color: c.text,
            textAlignVertical: "center",
            includeFontPadding: false,
            paddingVertical: 0,
            lineHeight: 20,
          }}
          className="border rounded-xl px-4 h-14 text-base mb-4"
        />

        <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
          {t("profile.weight")}
        </Text>
        <TextInput
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder={t("profile.weightPlaceholder")}
          placeholderTextColor={c.placeholder}
          keyboardType="number-pad"
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            color: c.text,
            textAlignVertical: "center",
            includeFontPadding: false,
            paddingVertical: 0,
            lineHeight: 20,
          }}
          className="border rounded-xl px-4 h-14 text-base mb-4"
        />

        <Text style={{ color: c.textSecondary }} className="text-sm font-semibold mb-2">
          {t("profile.conditions")}
        </Text>
        <Pressable
          onPress={() => setSheetVisible(true)}
          style={{ backgroundColor: c.surface, borderColor: c.border }}
          className="border rounded-xl px-4 py-4 mb-6 flex-row items-center justify-between"
        >
          <Text style={{ color: c.text }} className="text-base flex-1 mr-2" numberOfLines={1}>
            {conditionTypes.map((type) => t(`profile.conditionsList.${type}`)).join(", ")}
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
                {t("profile.conditions")}
              </Text>
              <Pressable onPress={() => setSheetVisible(false)}>
                <Ionicons name="close" size={22} color={c.iconSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CONDITION_OPTIONS.map((type) => {
                const selected = conditionTypes.includes(type);
                return (
                  <Pressable
                    key={type}
                    onPress={() => toggleCondition(type)}
                    style={{ borderColor: c.border }}
                    className="flex-row items-center justify-between py-3 border-b"
                  >
                    <Text style={{ color: c.text }} className="text-base">
                      {t(`profile.conditionsList.${type}`)}
                    </Text>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={c.accent} /> : <Ionicons name="ellipse-outline" size={22} color={c.iconSecondary} />}
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
