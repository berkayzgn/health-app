import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import * as Device from "expo-device";
import { useFonts } from "expo-font";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import LabelScanSkeleton from "../../components/LabelScanSkeleton";
import MultiSelectSheet from "../../components/MultiSelectSheet";
import { useStore } from "../../store/useStore";
import { MOCK_LABEL_SCAN_RESULT } from "../../utils/labelScanMock";
import type { LabelScanResult } from "../../services/labelScanService";
import { scanLabel as apiScanLabel } from "../../services/labelScanService";
import * as authService from "../../services/authService";
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
  launchCameraForLabelScan,
  launchImageLibrary,
} from "../../utils/mediaImagePick";

type Phase = "needs_conditions" | "idle" | "analyzing" | "result" | "canceled";

const ANALYZE_DELAY_MS = 900;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Görüntüleme için basit baş harf büyütme (API küçük harf dönebilir). */
function displayIngredientName(name: string): string {
  const t = name.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Backend Textract yapılandırması yoksa dönen hata (galeri/kamera fark etmez). */
function isTextractConfigErrorMessage(message: string): boolean {
  return (
    /textract/i.test(message) &&
    /yapılandır|configured|AWS_ACCESS|ACCESS_KEY|sunucuda|not configured/i.test(
      message,
    )
  );
}

export default function ScanScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const userProfile = useStore((s) => s.userProfile);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const medicalConditions = useStore((s) => s.medicalConditions);
  const medicalConditionsLoaded = useStore((s) => s.medicalConditionsLoaded);
  const loadMedicalConditions = useStore((s) => s.loadMedicalConditions);

  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<LabelScanResult | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(
    () => new Set(),
  );
  const [diseaseSheetOpen, setDiseaseSheetOpen] = useState(false);
  const [allergySheetOpen, setAllergySheetOpen] = useState(false);
  const [savingConditions, setSavingConditions] = useState(false);

  const initialPickDone = useRef(false);

  const medicalCodeSet = useMemo(
    () => new Set(medicalConditions.map((c) => c.code)),
    [medicalConditions],
  );

  const profileReady = userProfile !== null;

  const hasMedicalSelections = useMemo(() => {
    if (!userProfile) return false;
    const types = userProfile.conditionTypes ?? [];
    return types.some((code) => medicalCodeSet.has(code));
  }, [userProfile, medicalCodeSet]);

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

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      if (!medicalConditionsLoaded) void loadMedicalConditions();
    }, [refreshProfile, medicalConditionsLoaded, loadMedicalConditions]),
  );

  useEffect(() => {
    if (!userProfile || !medicalConditionsLoaded) return;
    const fromProfile = new Set<string>();
    for (const code of userProfile.conditionTypes ?? []) {
      if (medicalCodeSet.has(code)) fromProfile.add(code);
    }
    setSelectedConditions(fromProfile);
  }, [userProfile, medicalConditionsLoaded, medicalCodeSet]);

  useEffect(() => {
    if (!medicalConditionsLoaded || !profileReady) return;
    if (!hasMedicalSelections) {
      setPhase("needs_conditions");
      initialPickDone.current = false;
      return;
    }
    if (initialPickDone.current) return;
    if (phase !== "idle" || result) return;
    initialPickDone.current = true;
    showPickSourceRef.current();
  }, [
    medicalConditionsLoaded,
    profileReady,
    hasMedicalSelections,
    phase,
    result,
  ]);

  const showPickSourceRef = useRef<() => void>(() => {});

  const runAnalyze = useCallback(async (imageUri: string) => {
    setPhase("analyzing");
    if (__DEV__ && imageUri === "simulator-mock") {
      await delay(ANALYZE_DELAY_MS);
      setResult(MOCK_LABEL_SCAN_RESULT as unknown as LabelScanResult);
      setPhase("result");
      return;
    }
    const scanLocale = i18n.language.startsWith("tr") ? "tr" : "en";
    try {
      const scanResult = await apiScanLabel(imageUri, scanLocale);
      setResult(scanResult);
      setPhase("result");
    } catch (err) {
      if (__DEV__) console.error("[scan] API error", err);
      const raw =
        err instanceof Error ? err.message : t("auth.errorGeneric");
      const body = isTextractConfigErrorMessage(raw)
        ? t("labelScan.serverTextractNotConfigured")
        : raw;
      Alert.alert(t("auth.errorTitle"), body);
      setPhase("canceled");
    }
  }, [t, i18n.language]);

  const runCameraFlow = useCallback(async () => {
    try {
      const ok = await ensureCameraPermission(t);
      if (!ok) {
        setPhase("canceled");
        return;
      }
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      const pick = await launchCameraForLabelScan();
      if (pick.canceled) {
        setPhase("canceled");
        return;
      }
      const uri = pick.assets[0]?.uri;
      if (!uri) {
        setPhase("canceled");
        return;
      }
      await runAnalyze(uri);
    } catch (e) {
      if (__DEV__) console.error("[scan] camera", e);
      Alert.alert(t("auth.errorTitle"), t("auth.errorGeneric"));
      setPhase("canceled");
    }
  }, [runAnalyze, t]);

  const runLibraryFlow = useCallback(async () => {
    try {
      const ok = await ensureMediaLibraryPermission(t);
      if (!ok) {
        setPhase("canceled");
        return;
      }
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      const pick = await launchImageLibrary();
      if (pick.canceled) {
        setPhase("canceled");
        return;
      }
      const uri = pick.assets[0]?.uri;
      if (!uri) {
        setPhase("canceled");
        return;
      }
      await runAnalyze(uri);
    } catch (e) {
      if (__DEV__) console.error("[scan] library", e);
      Alert.alert(t("auth.errorTitle"), t("auth.errorGeneric"));
      setPhase("canceled");
    }
  }, [runAnalyze, t]);

  const showPickSource = useCallback(() => {
    if (!Device.isDevice) {
      Alert.alert(
        t("nutritionMeal.pickImageTitle"),
        t("labelScan.scanPickSubtitle"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => setPhase("canceled"),
          },
          {
            text: t("nutritionMeal.pickFromLibrary"),
            onPress: () => {
              void runLibraryFlow();
            },
          },
          ...(__DEV__
            ? [
                {
                  text: t("labelScan.devPreviewMock"),
                  onPress: () => {
                    void runAnalyze("simulator-mock");
                  },
                },
              ]
            : []),
          {
            text: t("nutritionMeal.takePhoto"),
            onPress: () => {
              Alert.alert(
                t("nutritionMeal.cameraSimulatorTitle"),
                t("nutritionMeal.cameraSimulatorMessage"),
                [
                  {
                    text: t("common.cancel"),
                    style: "cancel",
                    onPress: () => setPhase("canceled"),
                  },
                  {
                    text: t("nutritionMeal.pickFromLibrary"),
                    onPress: () => {
                      void runLibraryFlow();
                    },
                  },
                ],
              );
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      t("nutritionMeal.pickImageTitle"),
      t("labelScan.scanPickSubtitle"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
          onPress: () => setPhase("canceled"),
        },
        {
          text: t("nutritionMeal.takePhoto"),
          onPress: () => {
            void runCameraFlow();
          },
        },
        {
          text: t("nutritionMeal.pickFromLibrary"),
          onPress: () => {
            void runLibraryFlow();
          },
        },
      ],
    );
  }, [runAnalyze, runCameraFlow, runLibraryFlow, t]);

  showPickSourceRef.current = showPickSource;

  const toggleCondition = useCallback((code: string) => {
    setSelectedConditions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const onSaveConditionsAndScan = useCallback(async () => {
    if (!userProfile || savingConditions) return;
    if (selectedConditions.size === 0) {
      Alert.alert(
        t("onboarding.requiredFieldsTitle"),
        t("labelScan.needsConditionsSubtitle"),
      );
      return;
    }
    setSavingConditions(true);
    try {
      await authService.updateProfile({
        conditionTypes: [...selectedConditions],
        dietaryPreferences: userProfile.dietaryPreferences ?? [],
        selectedDietTypeCode: userProfile.selectedDietTypeCode ?? null,
      });
      await refreshProfile();
      setPhase("idle");
      initialPickDone.current = true;
      showPickSource();
    } catch (e) {
      Alert.alert(
        t("auth.errorTitle"),
        e instanceof Error ? e.message : t("auth.errorGeneric"),
      );
    } finally {
      setSavingConditions(false);
    }
  }, [
    userProfile,
    savingConditions,
    selectedConditions,
    refreshProfile,
    showPickSource,
    t,
  ]);

  const onRetry = useCallback(() => {
    if (!hasMedicalSelections) {
      setPhase("needs_conditions");
      return;
    }
    showPickSource();
  }, [hasMedicalSelections, showPickSource]);

  const onScanAgain = useCallback(() => {
    setResult(null);
    setPhase("idle");
    if (!hasMedicalSelections) {
      setPhase("needs_conditions");
      return;
    }
    showPickSource();
  }, [hasMedicalSelections, showPickSource]);

  const onAddToMeal = useCallback(() => {
    Alert.alert(t("auth.comingSoon"));
  }, [t]);

  const onPrimaryFixed = "#3a4a00";

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  const catalogLoading = !medicalConditionsLoaded;

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <AppHeader variant="inner" title={t("home.dashboard.ctaScanMeal")} />

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

        {phase === "needs_conditions" ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: insets.bottom + 32,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              className="mb-2 text-2xl text-on-surface"
              style={{ fontFamily: "Manrope_800ExtraBold" }}
            >
              {t("labelScan.needsConditionsTitle")}
            </Text>
            <Text
              className="mb-8 text-base leading-relaxed text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("labelScan.needsConditionsSubtitle")}
            </Text>

            {catalogLoading ? (
              <ActivityIndicator size="large" color="#4e6300" />
            ) : (
              <View className="gap-6">
                <View>
                  <Text
                    className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t("onboarding.diseasesLabel")}
                  </Text>
                  <Pressable
                    onPress={() => setDiseaseSheetOpen(true)}
                    className="flex-row items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low px-5 py-4 active:bg-surface-container"
                  >
                    <MaterialIcons name="medical-services" size={22} color="#767777" />
                    <Text
                      className={`ml-3 flex-1 text-[15px] ${
                        selectedDiseaseCount > 0 ? "text-on-surface" : "text-outline"
                      }`}
                      style={{ fontFamily: "Inter_400Regular" }}
                      numberOfLines={2}
                    >
                      {selectedDiseaseCount > 0
                        ? diseaseSummary
                        : t("onboarding.diseasesPlaceholder")}
                    </Text>
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
                    className="flex-row items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low px-5 py-4 active:bg-surface-container"
                  >
                    <MaterialIcons name="warning-amber" size={22} color="#767777" />
                    <Text
                      className={`ml-3 flex-1 text-[15px] ${
                        selectedAllergyCount > 0 ? "text-on-surface" : "text-outline"
                      }`}
                      style={{ fontFamily: "Inter_400Regular" }}
                      numberOfLines={2}
                    >
                      {selectedAllergyCount > 0
                        ? allergySummary
                        : t("onboarding.allergiesPlaceholder")}
                    </Text>
                    <MaterialIcons name="expand-more" size={22} color="#767777" />
                  </Pressable>
                </View>

                {selectedConditions.size > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {medicalConditions
                      .filter((mc) => selectedConditions.has(mc.code))
                      .map((mc) => (
                        <Pressable
                          key={mc.code}
                          onPress={() => toggleCondition(mc.code)}
                          className="flex-row items-center gap-1.5 rounded-full bg-primary-fixed px-4 py-2"
                        >
                          <Text
                            className="text-xs font-medium text-on-primary-fixed"
                            style={{ fontFamily: "Inter_400Regular" }}
                          >
                            {mc.displayNames[lang] ?? mc.displayNames.en ?? mc.code}
                          </Text>
                          <MaterialIcons name="close" size={14} color={onPrimaryFixed} />
                        </Pressable>
                      ))}
                  </View>
                ) : null}

                <Pressable
                  onPress={() => void onSaveConditionsAndScan()}
                  disabled={savingConditions || selectedConditions.size === 0}
                  className="mt-4 h-14 flex-row items-center justify-center rounded-full bg-primary-fixed active:opacity-90"
                  style={{
                    opacity: savingConditions || selectedConditions.size === 0 ? 0.5 : 1,
                  }}
                >
                  {savingConditions ? (
                    <ActivityIndicator color="#3a4a00" />
                  ) : (
                    <Text
                      className="text-base font-bold text-on-primary-fixed"
                      style={{ fontFamily: "Manrope_700Bold" }}
                    >
                      {t("labelScan.saveConditionsAndContinue")}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        ) : null}

        {phase === "analyzing" ? (
          <View className="flex-1">
            <LabelScanSkeleton />
            <View className="items-center px-8 pb-8">
              <Text
                className="text-center text-base text-on-surface"
                style={{ fontFamily: "Manrope_700Bold" }}
              >
                {t("labelScan.analyzing")}
              </Text>
              <Text
                className="mt-2 text-center text-sm text-on-surface-variant"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {t("labelScan.analyzingHint")}
              </Text>
            </View>
          </View>
        ) : null}

        {phase === "canceled" ? (
          <View className="flex-1 items-center justify-center px-8">
            <MaterialCommunityIcons name="camera-off-outline" size={56} color="#767777" />
            <Text
              className="mt-4 text-center text-lg text-on-surface"
              style={{ fontFamily: "Manrope_700Bold" }}
            >
              {t("labelScan.cameraCanceled")}
            </Text>
            <Text
              className="mt-2 text-center text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("labelScan.cameraCanceledMessage")}
            </Text>
            <Pressable
              onPress={onRetry}
              className="mt-8 rounded-full bg-primary-fixed px-8 py-4 active:opacity-90"
            >
              <Text
                className="text-on-primary-fixed"
                style={{ fontFamily: "Manrope_700Bold" }}
              >
                {t("labelScan.retryCamera")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "result" && result ? (
          <>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: insets.bottom + 120,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-8">
                <View className="flex-col gap-6">
                  <View className="relative flex-1 overflow-hidden rounded-2xl bg-surface-container-lowest p-8 shadow-ambient">
                    <View className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-fixed opacity-10" />
                    <View className="relative z-10">
                      <Text
                        className="mb-4 text-[10px] font-bold uppercase tracking-widest text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("labelScan.analysisResult")}
                      </Text>
                      <Text
                        className="mb-2 text-3xl text-on-surface"
                        style={{ fontFamily: "Manrope_800ExtraBold" }}
                      >
                        {result.productTitle}
                      </Text>
                      <Text
                        className="mb-8 max-w-lg text-on-surface-variant"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {result.summaryLine}
                      </Text>
                      {result.safetyLabel === "safe" ? (
                        <View className="flex-row items-center gap-4 self-start rounded-full border border-primary/10 bg-primary-container px-6 py-4">
                          <MaterialCommunityIcons name="check-circle" size={28} color="#4a5e00" />
                          <Text
                            className="text-2xl text-on-primary-container"
                            style={{ fontFamily: "Manrope_800ExtraBold" }}
                          >
                            {t("labelScan.safe")}
                          </Text>
                        </View>
                      ) : null}
                      {result.safetyLabel === "caution" ? (
                        <View className="flex-row items-center gap-4 self-start rounded-full border border-yellow-400/20 bg-yellow-100 px-6 py-4">
                          <MaterialCommunityIcons name="alert-circle" size={28} color="#b45309" />
                          <Text
                            className="text-2xl text-yellow-800"
                            style={{ fontFamily: "Manrope_800ExtraBold" }}
                          >
                            {t("labelScan.caution")}
                          </Text>
                        </View>
                      ) : null}
                      {result.safetyLabel === "avoid" ? (
                        <View className="flex-row items-center gap-4 self-start rounded-full border border-error/20 bg-error-container px-6 py-4">
                          <MaterialCommunityIcons name="close-circle" size={28} color="#b02500" />
                          <Text
                            className="text-2xl text-on-error-container"
                            style={{ fontFamily: "Manrope_800ExtraBold" }}
                          >
                            {t("labelScan.avoid")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
                    <Text
                      className="mb-3 text-[10px] font-bold uppercase tracking-widest text-outline"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("labelScan.extractedIngredientsEn")}
                    </Text>
                    <Text
                      className="text-base leading-relaxed text-on-surface"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {result.ingredients
                        .map((ing) => displayIngredientName(ing.name))
                        .join(", ")}
                    </Text>
                  </View>

                  <View className="w-full gap-4">
                    <View className="h-40 justify-between rounded-2xl bg-surface-container-low p-6">
                      <Text
                        className="text-[10px] font-bold uppercase tracking-widest text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("labelScan.glycemicImpact")}
                      </Text>
                      <View className="flex-row items-end justify-between">
                        <Text
                          className="text-3xl text-on-surface"
                          style={{ fontFamily: "Manrope_800ExtraBold" }}
                        >
                          {result.glycemicImpact}
                        </Text>
                        <MaterialCommunityIcons name="chart-line" size={40} color="#4e6300" />
                      </View>
                    </View>
                    <View className="h-40 justify-between rounded-2xl bg-surface-container-low p-6">
                      <Text
                        className="text-[10px] font-bold uppercase tracking-widest text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("labelScan.processingGrade")}
                      </Text>
                      <View className="flex-row items-end justify-between">
                        <Text
                          className="text-3xl text-on-surface"
                          style={{ fontFamily: "Manrope_800ExtraBold" }}
                        >
                          {result.processingGrade}
                        </Text>
                        <MaterialCommunityIcons name="shield-check" size={40} color="#4e6300" />
                      </View>
                    </View>
                  </View>
                </View>

                <View>
                  <View className="mb-8 flex-row items-baseline justify-between">
                    <Text
                      className="text-2xl text-on-surface"
                      style={{ fontFamily: "Manrope_700Bold" }}
                    >
                      {t("labelScan.ingredientBreakdown")}
                    </Text>
                    <Text
                      className="text-sm font-medium text-on-surface-variant"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {t("labelScan.ingredientsCount", {
                        count: result.ingredients.length,
                      })}
                    </Text>
                  </View>
                  <View className="gap-4">
                    {result.ingredients.map((ing, idx) => (
                      <View
                        key={`${ing.name}-${idx}`}
                        className={`w-full p-6 ${
                          ing.variant === "warning"
                            ? "rounded-xl border-l-4 border-error bg-error-container/10"
                            : "rounded-xl border-l-4 border-primary/20 bg-surface-container-lowest"
                        }`}
                      >
                        <View className="mb-4 flex-row items-start justify-between gap-2">
                          <Text
                            className="flex-1 text-lg text-on-surface"
                            style={{ fontFamily: "Manrope_700Bold" }}
                          >
                            {displayIngredientName(ing.name)}
                          </Text>
                          <View
                            className={`rounded px-2 py-1 ${
                              ing.variant === "warning"
                                ? "bg-error-container"
                                : "bg-surface-container"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-bold uppercase ${
                                ing.variant === "warning"
                                  ? "text-on-error-container"
                                  : "text-on-surface-variant"
                              }`}
                              style={{ fontFamily: "Inter_600SemiBold" }}
                            >
                              {ing.tag}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="text-sm leading-relaxed text-on-surface-variant"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {ing.description}{" "}
                          {ing.cautionAmount ? (
                            <Text className="font-bold text-error">{ing.cautionAmount}</Text>
                          ) : null}
                          {ing.variant === "warning" && ing.cautionAmount ? "." : ""}
                        </Text>
                        {ing.warningFooter ? (
                          <View className="mt-4 flex-row items-center gap-2">
                            <MaterialCommunityIcons name="alert" size={16} color="#b02500" />
                            <Text
                              className="text-[11px] font-bold uppercase tracking-wider text-error"
                              style={{ fontFamily: "Inter_600SemiBold" }}
                            >
                              {ing.warningFooter}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View
              className="absolute right-6 z-40 flex-row"
              style={{ bottom: Math.max(insets.bottom, 16) + 56 }}
            >
              <Pressable
                onPress={onAddToMeal}
                className="flex-row items-center gap-3 rounded-full bg-primary-fixed px-8 py-4 shadow-lg active:scale-95"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={26} color="#3a4a00" />
                <Text
                  className="text-on-primary-fixed"
                  style={{ fontFamily: "Manrope_800ExtraBold" }}
                >
                  {t("labelScan.addToMeal")}
                </Text>
              </Pressable>
            </View>

            <View
              className="absolute bottom-0 left-0 right-0 border-t border-surface-container-high bg-surface/95 px-6 py-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Pressable
                onPress={onScanAgain}
                className="items-center rounded-full bg-surface-container-low py-3 active:opacity-90"
              >
                <Text
                  className="text-on-surface font-bold"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {t("labelScan.scanAgain")}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {phase === "idle" && !result && !profileReady ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4e6300" />
          </View>
        ) : null}

        {phase === "idle" && !result && profileReady && hasMedicalSelections ? (
          <View className="flex-1 bg-surface" />
        ) : null}
      </SafeAreaWrapper>
    </View>
  );
}
