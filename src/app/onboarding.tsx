import { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useFonts } from "expo-font";
import { Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import MultiSelectSheet from "../components/MultiSelectSheet";
import { useStore } from "../store/useStore";
import * as authService from "../services/authService";
import { buildHealthConditionTypesPayload } from "../utils/conditionTypesDisplay";
import type { MedicalConditionDTO } from "../services/catalogService";

const ON_PRIMARY = "#3a4a00";

function BigSelectCard({
  icon,
  kicker,
  title,
  emptyHint,
  selectedItems,
  lang,
  onPress,
  onRemove,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  kicker: string;
  title: string;
  emptyHint: string;
  selectedItems: MedicalConditionDTO[];
  lang: "tr" | "en";
  onPress: () => void;
  onRemove: (code: string) => void;
}) {
  const count = selectedItems.length;
  const hasSelection = count > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <View className="relative overflow-hidden rounded-3xl bg-primary-fixed px-8 py-8">
        <View className="flex-row items-center">
        <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-white/60">
          <MaterialIcons name={icon} size={26} color={ON_PRIMARY} />
        </View>
        <Text
          className="flex-1 text-[13px] font-bold uppercase tracking-[0.10em] text-on-primary-fixed"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {kicker}
        </Text>
        {hasSelection && (
          <View className="rounded-full bg-on-primary-fixed px-4 py-1.5">
            <Text
              className="text-[14px] font-bold text-primary-fixed"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {count}
            </Text>
          </View>
        )}
      </View>

      <Text
        className="mt-5 text-[28px] leading-8 tracking-tight text-on-primary-fixed"
        style={{ fontFamily: "Manrope_700Bold" }}
      >
        {title}
      </Text>

      {hasSelection ? (
        <View className="mt-4 flex-row flex-wrap">
          {selectedItems.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => onRemove(c.code)}
              className="mr-2 mb-2 flex-row items-center rounded-full bg-white/85 px-3 py-2 active:opacity-80"
              hitSlop={4}
            >
              <Text
                className="text-[13px] text-on-primary-fixed"
                style={{ fontFamily: "Inter_500Medium" }}
                numberOfLines={1}
              >
                {c.displayNames[lang] ?? c.displayNames.en ?? c.code}
              </Text>
              <MaterialIcons name="close" size={14} color={ON_PRIMARY} style={{ marginLeft: 6 }} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="mt-4 flex-row items-center justify-between">
          <Text
            className="flex-1 pr-3 text-[16px] leading-6 text-on-primary-fixed/85"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {emptyHint}
          </Text>
          <MaterialIcons name="arrow-forward" size={22} color={ON_PRIMARY} />
        </View>
      )}
      </View>
    </Pressable>
  );
}

/* ─── Ana ekran ──────────────────────────────────────────────────────── */
export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router      = useRouter();

  const authUser = useStore((s) => s.authUser);
  const refreshProfile     = useStore((s) => s.refreshProfile);
  const setOnboardingGateComplete = useStore((s) => s.setOnboardingGateComplete);
  const medicalConditions  = useStore((s) => s.medicalConditions);
  const conditionsLoaded   = useStore((s) => s.medicalConditionsLoaded);
  const loadConditions     = useStore((s) => s.loadMedicalConditions);

  const lang: "tr" | "en" = i18n.language?.startsWith("tr") ? "tr" : "en";

  useEffect(() => { if (!conditionsLoaded) loadConditions(); }, [conditionsLoaded, loadConditions]);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[onboarding] nativewind cards build v4");
  }, []);

  const [fontsLoaded] = useFonts({
    Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [diseaseSheetOpen, setDiseaseSheetOpen] = useState(false);
  const [allergySheetOpen, setAllergySheetOpen] = useState(false);

  const toggle = useCallback((code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }, []);

  const diseases = useMemo(
    () => medicalConditions.filter((c) => c.kind === "disease"),
    [medicalConditions],
  );
  const allergies = useMemo(
    () => medicalConditions.filter((c) => c.kind === "allergy"),
    [medicalConditions],
  );

  const selectedDiseases = useMemo(
    () => diseases.filter((c) => selected.has(c.code)),
    [diseases, selected],
  );
  const selectedAllergies = useMemo(
    () => allergies.filter((c) => selected.has(c.code)),
    [allergies, selected],
  );

  const onFinish = async () => {
    if (saving) return;
    if (selected.size === 0) {
      Alert.alert(t("onboarding.requiredConditionsTitle"), t("onboarding.requiredConditionsMessage"));
      return;
    }
    setSaving(true);
    try {
      await authService.updateProfile({
        conditionTypes: buildHealthConditionTypesPayload(selected),
      });
      await refreshProfile();
      setOnboardingGateComplete(true);
      router.replace("/payment/manage");
    } catch (e) {
      Alert.alert(t("auth.errorTitle"), e instanceof Error ? e.message : t("onboarding.errorSave"));
    } finally {
      setSaving(false);
    }
  };

  const onSkip = () => {
    if (saving) return;
    setOnboardingGateComplete(true);
    router.replace("/payment/manage");
  };

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={ON_PRIMARY} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />

      <MultiSelectSheet
        visible={diseaseSheetOpen}
        title={t("onboarding.diseasesSheetTitle")}
        hint={t("onboarding.diseasesSheetHint")}
        items={diseases}
        selected={selected}
        lang={lang}
        onToggle={toggle}
        onClose={() => setDiseaseSheetOpen(false)}
      />
      <MultiSelectSheet
        visible={allergySheetOpen}
        title={t("onboarding.allergiesSheetTitle")}
        hint={t("onboarding.allergiesSheetHint")}
        items={allergies}
        selected={selected}
        lang={lang}
        onToggle={toggle}
        onClose={() => setAllergySheetOpen(false)}
      />

      <SafeAreaWrapper className="flex-1 bg-background" edges={["top"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-14 pb-4">
            <Text
              className="text-on-surface leading-tight tracking-tighter mb-3"
              style={{ fontFamily: "Manrope_800ExtraBold", fontSize: 34, lineHeight: 40 }}
            >
              {t("onboarding.profileSetupTitle")}
            </Text>
            <Text
              className="text-on-surface-variant leading-relaxed"
              style={{ fontFamily: "Inter_400Regular", fontSize: 18, lineHeight: 28 }}
            >
              {t("onboarding.profileSetupSubtitle")}
            </Text>
          </View>

          {!conditionsLoaded ? (
            <View className="min-h-[280px] flex-1 items-center justify-center py-12">
              <ActivityIndicator color={ON_PRIMARY} />
            </View>
          ) : (
            <View className="flex-1 justify-center gap-6 py-8" style={{ minHeight: 400 }}>
              <BigSelectCard
                icon="medical-services"
                kicker={t("onboarding.diseasesLabel")}
                title={t("onboarding.diseasesCardTitle")}
                emptyHint={t("onboarding.diseasesCardHint")}
                selectedItems={selectedDiseases}
                lang={lang}
                onPress={() => setDiseaseSheetOpen(true)}
                onRemove={toggle}
              />
              <BigSelectCard
                icon="warning-amber"
                kicker={t("onboarding.allergiesLabel")}
                title={t("onboarding.allergiesCardTitle")}
                emptyHint={t("onboarding.allergiesCardHint")}
                selectedItems={selectedAllergies}
                lang={lang}
                onPress={() => setAllergySheetOpen(true)}
                onRemove={toggle}
              />
            </View>
          )}
        </ScrollView>

        <View className="bg-background px-6 pt-3 pb-6">
          <Pressable onPress={onFinish} disabled={saving} style={({ pressed }) => ({ opacity: saving ? 0.55 : pressed ? 0.9 : 1 })}>
            <View className="h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary-fixed">
              {saving ? (
                <ActivityIndicator color={ON_PRIMARY} />
              ) : (
                <>
                  <Text
                    className="text-base font-bold text-on-primary-fixed"
                    style={{ fontFamily: "Manrope_700Bold" }}
                  >
                    {t("onboarding.finishSetupCta")}
                  </Text>
                  <MaterialIcons name="check" size={22} color={ON_PRIMARY} />
                </>
              )}
            </View>
          </Pressable>

          <Pressable onPress={onSkip} disabled={saving} className="mt-3 items-center active:opacity-70">
            <Text className="text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
              {t("onboarding.skipForNow")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
