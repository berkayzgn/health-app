import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";
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
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";
import * as authService from "../../services/authService";
import {
  HEALTH_CONDITION_IDS,
  parseHealthConditionsFromProfile,
  buildHealthConditionTypesPayload,
} from "../../utils/conditionTypesDisplay";

const TAG_I18N: Record<(typeof HEALTH_CONDITION_IDS)[number], string> = {
  diabetes: "onboarding.tagDiabetes",
  hypertension: "onboarding.tagHypertension",
  asthma: "onboarding.tagAsthma",
};

export default function EditHealthProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const userProfile = useStore((s) => s.userProfile);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const theme = useStore((s) => s.theme);

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [otherDraft, setOtherDraft] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!userProfile || hydrated.current) return;
    hydrated.current = true;
    setHeight(String(userProfile.heightCm ?? "").trim());
    setWeight(String(userProfile.weightKg ?? "").trim());
    const { selected: s, customTags: c } = parseHealthConditionsFromProfile(userProfile.conditionTypes);
    setSelected(s);
    setCustomTags(c);
  }, [userProfile]);

  const metricsRow = width >= 720;

  const toggleTag = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addCustomTag = useCallback(() => {
    const v = otherDraft.trim();
    if (!v) return;
    setCustomTags((prev) => [...prev, v]);
    setOtherDraft("");
    setShowOther(false);
  }, [otherDraft]);

  const removeCustomTag = useCallback((idx: number) => {
    setCustomTags((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const canSave = useMemo(() => {
    const h = parseFloat(height.replace(",", "."));
    const w = parseFloat(weight.replace(",", "."));
    return Number.isFinite(h) && h > 0 && Number.isFinite(w) && w > 0;
  }, [height, weight]);

  const onSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const conditionTypes = buildHealthConditionTypesPayload(selected, customTags);
      await authService.updateProfile({
        heightCm: height.trim(),
        weightKg: weight.trim(),
        conditionTypes,
      });
      await refreshProfile();
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("onboarding.errorSave");
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setSaving(false);
    }
  };

  const bottomPad = 24 + Math.max(insets.bottom, 12);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#4e6300" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="inner" title={t("profile.editHealthTitle")} />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: bottomPad + 88,
              maxWidth: 960,
              width: "100%",
              alignSelf: "center",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              className="mb-8 text-base leading-relaxed text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("profile.editHealthSubtitle")}
            </Text>

            <View
              className="mb-10 gap-4"
              style={{ flexDirection: metricsRow ? "row" : "column" }}
            >
              {(
                [
                  {
                    key: "w",
                    label: t("onboarding.weight"),
                    value: weight,
                    set: setWeight,
                    suffix: t("onboarding.kg"),
                    ph: "72",
                    keyboard: "decimal-pad" as const,
                  },
                  {
                    key: "h",
                    label: t("onboarding.height"),
                    value: height,
                    set: setHeight,
                    suffix: t("onboarding.cm"),
                    ph: "182",
                    keyboard: "decimal-pad" as const,
                  },
                ] as const
              ).map((field) => (
                <View
                  key={field.key}
                  className="rounded-card bg-surface-container-low p-6"
                  style={{ flex: metricsRow ? 1 : undefined }}
                >
                  <Text
                    className="mb-4 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {field.label}
                  </Text>
                  <View className="flex-row items-baseline gap-1">
                    <TextInput
                      value={field.value}
                      onChangeText={field.set}
                      placeholder={field.ph}
                      keyboardType={field.keyboard}
                      className="min-h-[40px] flex-1 text-3xl text-on-surface"
                      style={{ fontFamily: "Manrope_700Bold" }}
                      placeholderTextColor="#dbdddd"
                    />
                    <Text
                      className="text-sm font-medium text-outline"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      {field.suffix}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="mb-6 gap-6">
              <Text
                className="text-lg text-on-surface"
                style={{ fontFamily: "Manrope_700Bold" }}
              >
                {t("profile.conditionSectionTitle")}
              </Text>

              <View className="flex-row flex-wrap gap-3">
                {HEALTH_CONDITION_IDS.map((id) => {
                  const on = selected.has(id);
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggleTag(id)}
                      className={`flex-row items-center gap-2 rounded-pill border border-transparent px-6 py-3 ${
                        on ? "bg-primary-fixed" : "bg-surface-container"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${on ? "text-on-primary-fixed" : "text-on-surface-variant"}`}
                        style={{ fontFamily: "Inter_500Medium" }}
                      >
                        {t(TAG_I18N[id])}
                      </Text>
                      {on ? <MaterialIcons name="check" size={18} color="#3a4a00" /> : null}
                    </Pressable>
                  );
                })}

                {customTags.map((tag, idx) => (
                  <Pressable
                    key={`${tag}-${idx}`}
                    onPress={() => removeCustomTag(idx)}
                    className="flex-row items-center gap-1 rounded-pill border border-outline-variant/30 bg-surface-container-lowest px-4 py-3"
                  >
                    <Text
                      className="text-sm font-bold text-primary"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {tag}
                    </Text>
                    <MaterialIcons name="close" size={16} color="#4e6300" />
                  </Pressable>
                ))}

                {!showOther ? (
                  <Pressable
                    onPress={() => setShowOther(true)}
                    className="flex-row items-center gap-2 rounded-pill border border-outline-variant/30 px-5 py-3"
                  >
                    <MaterialIcons name="add" size={18} color="#4e6300" />
                    <Text
                      className="text-sm font-bold text-primary"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("onboarding.addOther")}
                    </Text>
                  </Pressable>
                ) : (
                  <View className="w-full flex-row items-center gap-2">
                    <TextInput
                      value={otherDraft}
                      onChangeText={setOtherDraft}
                      placeholder={t("onboarding.otherPlaceholder")}
                      onSubmitEditing={addCustomTag}
                      className="min-h-12 flex-1 rounded-card border border-outline-variant/40 px-4 text-on-surface"
                      style={{ fontFamily: "Inter_400Regular" }}
                      placeholderTextColor="#acadad"
                    />
                    <Pressable onPress={addCustomTag} className="rounded-full bg-primary px-4 py-3">
                      <MaterialIcons name="check" size={20} color="#3a4a00" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View
            className="border-t border-surface-container bg-surface px-6 pt-4"
            style={{ paddingBottom: bottomPad }}
          >
            <Pressable
              onPress={onSave}
              disabled={!canSave || saving}
              className="h-14 flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed active:opacity-90"
              style={{ opacity: !canSave || saving ? 0.5 : 1 }}
            >
              {saving ? (
                <ActivityIndicator color="#3a4a00" />
              ) : (
                <>
                  <Text
                    className="text-base font-bold text-on-primary-fixed"
                    style={{ fontFamily: "Manrope_700Bold" }}
                  >
                    {t("profile.saveChanges")}
                  </Text>
                  <MaterialIcons name="check" size={22} color="#3a4a00" />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
