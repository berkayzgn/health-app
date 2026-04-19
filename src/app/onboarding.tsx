import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
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
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useStore } from "../store/useStore";
import * as authService from "../services/authService";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex } from "../theme/designRgb";
import MultiSelectSheet from "../components/MultiSelectSheet";
import { buildHealthConditionTypesPayload } from "../utils/conditionTypesDisplay";

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refreshProfile = useStore((s) => s.refreshProfile);
  const clearAuth = useStore((s) => s.clearAuth);
  const theme = useStore((s) => s.theme);

  const medicalConditions = useStore((s) => s.medicalConditions);
  const medicalConditionsLoaded = useStore((s) => s.medicalConditionsLoaded);
  const loadMedicalConditions = useStore((s) => s.loadMedicalConditions);

  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";

  useEffect(() => {
    if (!medicalConditionsLoaded) loadMedicalConditions();
  }, [medicalConditionsLoaded, loadMedicalConditions]);

  const palette = theme === "dark" ? DARK_RGB : LIGHT_RGB;
  const onPrimaryFixed = rgbTripletToHex(palette["on-primary-fixed"]);
  const limeHex = rgbTripletToHex(palette["primary-fixed"]);
  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [diseaseSheetOpen, setDiseaseSheetOpen] = useState(false);
  const [allergySheetOpen, setAllergySheetOpen] = useState(false);

  const toggleCondition = useCallback((code: string) => {
    setSelectedConditions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const diseaseCatalog = useMemo(
    () => medicalConditions.filter((c) => c.kind === "disease"),
    [medicalConditions],
  );
  const allergyCatalog = useMemo(
    () => medicalConditions.filter((c) => c.kind === "allergy"),
    [medicalConditions],
  );

  const diseaseSummary = useMemo(() => {
    return diseaseCatalog
      .filter((mc) => selectedConditions.has(mc.code))
      .map((mc) => mc.displayNames[lang] ?? mc.displayNames.en ?? mc.code)
      .join(", ");
  }, [diseaseCatalog, selectedConditions, lang]);

  const allergySummary = useMemo(() => {
    return allergyCatalog
      .filter((mc) => selectedConditions.has(mc.code))
      .map((mc) => mc.displayNames[lang] ?? mc.displayNames.en ?? mc.code)
      .join(", ");
  }, [allergyCatalog, selectedConditions, lang]);

  const selectedDiseaseCount = useMemo(
    () => diseaseCatalog.filter((c) => selectedConditions.has(c.code)).length,
    [diseaseCatalog, selectedConditions],
  );
  const selectedAllergyCount = useMemo(
    () => allergyCatalog.filter((c) => selectedConditions.has(c.code)).length,
    [allergyCatalog, selectedConditions],
  );

  const canContinue = selectedConditions.size > 0;

  const onContinue = async () => {
    if (saving) return;
    if (!canContinue) {
      Alert.alert(
        t("onboarding.requiredConditionsTitle"),
        t("onboarding.requiredConditionsMessage"),
      );
      return;
    }
    setSaving(true);
    try {
      const conditionTypes = buildHealthConditionTypesPayload(selectedConditions);
      await authService.updateProfile({ conditionTypes });
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
  const catalogLoading = !medicalConditionsLoaded;

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      <MultiSelectSheet
        visible={diseaseSheetOpen}
        title={t("onboarding.diseasesSheetTitle")}
        hint={t("onboarding.diseasesSheetHint")}
        items={diseaseCatalog}
        selected={selectedConditions}
        lang={lang}
        onToggle={toggleCondition}
        onClose={() => setDiseaseSheetOpen(false)}
      />
      <MultiSelectSheet
        visible={allergySheetOpen}
        title={t("onboarding.allergiesSheetTitle")}
        hint={t("onboarding.allergiesSheetHint")}
        items={allergyCatalog}
        selected={selectedConditions}
        lang={lang}
        onToggle={toggleCondition}
        onClose={() => setAllergySheetOpen(false)}
      />

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
            {t("onboarding.stepOf", { current: 1, total: 1 })}
          </Text>
        </View>
        <View className="h-1 w-full bg-surface-container">
          <View className="h-full rounded-r-full bg-primary-fixed" style={{ width: "100%" }} />
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

          <View className="mb-6 gap-6">
            <Text
              className="text-lg text-on-surface"
              style={{ fontFamily: "Manrope_700Bold" }}
            >
              {t("onboarding.sectionTitle")}
            </Text>

            {catalogLoading ? (
              <ActivityIndicator size="small" color={rgbTripletToHex(palette.primary)} />
            ) : (
              <View className="gap-4">
                <View>
                  <Text
                    className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t("onboarding.diseasesLabel")}
                  </Text>
                  <Pressable
                    onPress={() => setDiseaseSheetOpen(true)}
                    className="flex-row items-center rounded-card border border-outline-variant/30 bg-surface-container-low px-5 py-4 active:bg-surface-container"
                  >
                    <MaterialIcons name="medical-services" size={20} color="#767777" />
                    <Text
                      className={`ml-3 flex-1 text-[15px] ${
                        selectedDiseaseCount > 0 ? "text-on-surface" : "text-outline"
                      }`}
                      style={{ fontFamily: "Inter_500Medium" }}
                      numberOfLines={2}
                    >
                      {selectedDiseaseCount > 0
                        ? diseaseSummary
                        : t("onboarding.diseasesPlaceholder")}
                    </Text>
                    {selectedDiseaseCount > 0 && (
                      <View className="mr-2 rounded-full bg-primary-fixed px-2.5 py-0.5">
                        <Text
                          className="text-[11px] font-bold text-on-primary-fixed"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {selectedDiseaseCount}
                        </Text>
                      </View>
                    )}
                    <MaterialIcons name="expand-more" size={22} color="#767777" />
                  </Pressable>
                </View>

                <View>
                  <Text
                    className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t("onboarding.allergiesLabel")}
                  </Text>
                  <Pressable
                    onPress={() => setAllergySheetOpen(true)}
                    className="flex-row items-center rounded-card border border-outline-variant/30 bg-surface-container-low px-5 py-4 active:bg-surface-container"
                  >
                    <MaterialIcons name="warning-amber" size={20} color="#767777" />
                    <Text
                      className={`ml-3 flex-1 text-[15px] ${
                        selectedAllergyCount > 0 ? "text-on-surface" : "text-outline"
                      }`}
                      style={{ fontFamily: "Inter_500Medium" }}
                      numberOfLines={2}
                    >
                      {selectedAllergyCount > 0
                        ? allergySummary
                        : t("onboarding.allergiesPlaceholder")}
                    </Text>
                    {selectedAllergyCount > 0 && (
                      <View className="mr-2 rounded-full bg-primary-fixed px-2.5 py-0.5">
                        <Text
                          className="text-[11px] font-bold text-on-primary-fixed"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {selectedAllergyCount}
                        </Text>
                      </View>
                    )}
                    <MaterialIcons name="expand-more" size={22} color="#767777" />
                  </Pressable>
                </View>

                {selectedConditions.size > 0 && (
                  <View className="flex-row flex-wrap gap-2">
                    {medicalConditions
                      .filter((mc) => selectedConditions.has(mc.code))
                      .map((mc) => (
                        <Pressable
                          key={mc.code}
                          onPress={() => toggleCondition(mc.code)}
                          className="flex-row items-center gap-1.5 rounded-pill bg-primary-fixed px-4 py-2"
                        >
                          <Text
                            className="text-xs font-medium text-on-primary-fixed"
                            style={{ fontFamily: "Inter_500Medium" }}
                          >
                            {mc.displayNames[lang] ?? mc.displayNames.en ?? mc.code}
                          </Text>
                          <MaterialIcons name="close" size={14} color={onPrimaryFixed} />
                        </Pressable>
                      ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-surface-container bg-surface px-6 pt-4"
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
            disabled={saving}
            className="flex-[2] flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed py-4 active:opacity-90"
            style={{
              opacity: saving ? 0.5 : 1,
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
      </View>
    </View>
  );
}
