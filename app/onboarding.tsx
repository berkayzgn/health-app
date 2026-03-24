import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
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
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useStore } from "../store/useStore";
import * as authService from "../services/authService";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex, rgbTripletToRgba } from "../theme/designRgb";

const STEP_CURRENT = 2;
const STEP_TOTAL = 4;
const PROGRESS = 0.5;

const CONDITION_IDS = ["diabetes", "hypertension", "asthma"] as const;
const DIETARY_IDS = ["gluten_free", "keto", "lactose_intolerant", "vegan"] as const;

const ALL_TAG_IDS = [...CONDITION_IDS, ...DIETARY_IDS] as const;

const TAG_I18N: Record<(typeof ALL_TAG_IDS)[number], string> = {
  diabetes: "onboarding.tagDiabetes",
  hypertension: "onboarding.tagHypertension",
  asthma: "onboarding.tagAsthma",
  gluten_free: "onboarding.tagGlutenFree",
  keto: "onboarding.tagKeto",
  lactose_intolerant: "onboarding.tagLactose",
  vegan: "onboarding.tagVegan",
};

const LAB_IMAGE_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAWZyIeX06itlFl4PIOT58B_73-YH9faJho0XsTAWUAU3u4YpQE1PRabVQ_p2ZVXsM16X0fEKXwQ0xclIppjrn5GK8J0r53UWABrV82LUJ5I_UDCbl6BywUwsqPPTriEMJb_s4cFER1_q8JCYzB5Sq7oOuAJPWyqQjR6f5VOU0TukzWuI9MjEGHlPf0Va_XK7_nwkHXBHI0U7RnkM6xk7lVQS7ISA3DcSkOksHNc4uHaaoch1UE732E-SPuRKAdxCD8hFq7nfZWqvQ";

function isCondition(id: string): boolean {
  return (CONDITION_IDS as readonly string[]).includes(id);
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const refreshProfile = useStore((s) => s.refreshProfile);
  const clearAuth = useStore((s) => s.clearAuth);
  const theme = useStore((s) => s.theme);
  const palette = theme === "dark" ? DARK_RGB : LIGHT_RGB;
  const surfaceHex = rgbTripletToHex(palette.surface);
  const surfaceFade = rgbTripletToRgba(palette.surface, 0.92);
  const onPrimaryFixed = rgbTripletToHex(palette["on-primary-fixed"]);
  const limeHex = rgbTripletToHex(palette["primary-fixed"]);
  const outlineHex = rgbTripletToHex(palette.outline);
  const placeholderMuted = rgbTripletToHex(palette["outline-variant"]);

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["diabetes", "keto"]),
  );
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [otherDraft, setOtherDraft] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const { conditionTypes, dietaryPreferences } = useMemo(() => {
    const cond: string[] = [];
    const diet: string[] = [];
    selected.forEach((id) => {
      if (isCondition(id)) cond.push(id);
      else diet.push(id);
    });
    customTags.forEach((c) => cond.push(`other:${c}`));
    return { conditionTypes: cond, dietaryPreferences: diet };
  }, [selected, customTags]);

  const canContinue = useMemo(() => {
    const h = parseFloat(height.replace(",", "."));
    const w = parseFloat(weight.replace(",", "."));
    return Number.isFinite(h) && h > 0 && Number.isFinite(w) && w > 0;
  }, [height, weight]);

  const onContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    try {
      await authService.updateProfile({
        heightCm: height.trim(),
        weightKg: weight.trim(),
        conditionTypes,
        dietaryPreferences,
      });
      await refreshProfile();
      router.replace("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("onboarding.errorSave");
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setSaving(false);
    }
  };

  const onBack = () => {
    Alert.alert(t("onboarding.backTitle"), t("onboarding.backMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("onboarding.signOut"),
        style: "destructive",
        onPress: () => {
          clearAuth();
          router.replace("/auth");
        },
      },
    ]);
  };

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={rgbTripletToHex(palette.primary)} />
      </View>
    );
  }

  const footerPad = Math.max(insets.bottom, 10) + 16;

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      {/* Header + progress */}
      <View
        className="absolute left-0 right-0 top-0 z-50 border-b border-surface-container bg-surface/95"
        style={{ paddingTop: insets.top }}
      >
        <View className="mx-auto w-full max-w-7xl flex-row items-center justify-between px-6 py-4">
          <Text
            className="text-xl tracking-tighter text-on-surface"
            style={{ fontFamily: "Manrope_800ExtraBold" }}
          >
            {t("common.appName")}
          </Text>
          <Text
            className="text-[0.7rem] font-bold uppercase tracking-[0.05em] text-outline"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {t("onboarding.stepOf", { current: STEP_CURRENT, total: STEP_TOTAL })}
          </Text>
        </View>
        <View className="h-1 w-full bg-surface-container">
          <View
            className="h-full rounded-r-full bg-primary-fixed"
            style={{ width: `${PROGRESS * 100}%` }}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 72,
          paddingBottom: footerPad + 88,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-2xl">
          <View className="mb-10">
            <Text
              className="mb-4 text-[2rem] leading-tight tracking-tight text-on-surface"
              style={{ fontFamily: "Manrope_800ExtraBold" }}
            >
              {t("onboarding.title")}
            </Text>
            <Text
              className="text-lg leading-relaxed text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("onboarding.subtitle")}
            </Text>
          </View>

          <View
            className="mb-10 gap-4"
            style={{ flexDirection: metricsRow ? "row" : "column" }}
          >
            {(
              [
                { key: "age", label: t("onboarding.age"), value: age, set: setAge, suffix: t("onboarding.yrs"), ph: "28", keyboard: "numeric" as const },
                { key: "w", label: t("onboarding.weight"), value: weight, set: setWeight, suffix: t("onboarding.kg"), ph: "72", keyboard: "decimal-pad" as const },
                { key: "h", label: t("onboarding.height"), value: height, set: setHeight, suffix: t("onboarding.cm"), ph: "182", keyboard: "decimal-pad" as const },
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
                    placeholderTextColor={placeholderMuted}
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
            <View className="flex-row items-center justify-between">
              <Text
                className="text-lg text-on-surface"
                style={{ fontFamily: "Manrope_700Bold" }}
              >
                {t("onboarding.sectionTitle")}
              </Text>
              <MaterialIcons name="info-outline" size={22} color={outlineHex} />
            </View>

            <View className="flex-row flex-wrap gap-3">
              {ALL_TAG_IDS.map((id) => {
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
                    {on ? (
                      <MaterialIcons name="check" size={18} color={onPrimaryFixed} />
                    ) : null}
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
                  <MaterialIcons name="close" size={16} color={rgbTripletToHex(palette.primary)} />
                </Pressable>
              ))}

              {!showOther ? (
                <Pressable
                  onPress={() => setShowOther(true)}
                  className="flex-row items-center gap-2 rounded-pill border border-outline-variant/30 px-5 py-3"
                >
                  <MaterialIcons name="add" size={18} color={rgbTripletToHex(palette.primary)} />
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
                    placeholderTextColor={placeholderMuted}
                  />
                  <Pressable
                    onPress={addCustomTag}
                    className="rounded-full bg-primary px-4 py-3"
                  >
                    <MaterialIcons name="check" size={20} color={onPrimaryFixed} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View className="relative mt-10 overflow-hidden rounded-card" style={{ aspectRatio: 21 / 9 }}>
            <Image
              source={{ uri: LAB_IMAGE_URI }}
              className="h-full w-full"
              style={{ opacity: 0.2 }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", surfaceFade, surfaceHex]}
              locations={[0, 0.55, 1]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className="absolute bottom-6 left-6 right-6">
              <Text
                className="text-xs font-bold uppercase tracking-widest text-outline"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {t("onboarding.clinicalLabel")}
              </Text>
              <Text
                className="mt-1 text-sm text-on-surface-variant"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {t("onboarding.clinicalCaption")}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <LinearGradient
        colors={["transparent", surfaceHex, surfaceHex]}
        locations={[0, 0.35, 1]}
        className="absolute bottom-0 left-0 right-0 px-6 pt-10"
        style={{ paddingBottom: footerPad }}
      >
        <View className="mx-auto w-full max-w-2xl flex-row gap-4">
          <Pressable
            onPress={onBack}
            className="flex-1 items-center justify-center rounded-pill py-4 active:bg-surface-container"
          >
            <Text
              className="font-bold text-on-surface-variant"
              style={{ fontFamily: "Manrope_700Bold" }}
            >
              {t("onboarding.back")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onContinue}
            disabled={!canContinue || saving}
            className="flex-[2] flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed py-4 active:opacity-90"
            style={{
              opacity: !canContinue || saving ? 0.5 : 1,
              shadowColor: limeHex,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            {saving ? (
              <ActivityIndicator color={onPrimaryFixed} />
            ) : (
              <>
                <Text
                  className="font-bold text-on-primary-fixed"
                  style={{ fontFamily: "Manrope_700Bold" }}
                >
                  {t("onboarding.continueCta")}
                </Text>
                <MaterialIcons name="arrow-forward" size={22} color={onPrimaryFixed} />
              </>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
