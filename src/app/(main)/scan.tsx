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
import { buildHealthConditionTypesPayload } from "../../utils/conditionTypesDisplay";
import ScanAnalysisDetailContent from "../../components/ScanAnalysisDetailContent";

type Phase = "needs_conditions" | "idle" | "analyzing" | "result" | "canceled";

const ANALYZE_DELAY_MS = 900;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Sunucu etiket AI’sı (Gemini) veya eski Textract mesajları için yapılandırma hatası. */
function isServerLabelAiConfigErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  if (/gemini|gemini_api_key/.test(m) && /yapılandır|configured|key|unavailable|503/i.test(message)) {
    return true;
  }
  return (
    /textract/i.test(message) &&
    /yapılandır|configured|AWS_ACCESS|ACCESS_KEY|sunucuda|not configured/i.test(message)
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
      const body = isServerLabelAiConfigErrorMessage(raw)
        ? t("labelScan.serverLabelAiNotConfigured")
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
        t("media.pickImageTitle"),
        t("labelScan.scanPickSubtitle"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => setPhase("canceled"),
          },
          {
            text: t("media.pickFromLibrary"),
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
            text: t("media.takePhoto"),
            onPress: () => {
              Alert.alert(
                t("media.cameraSimulatorTitle"),
                t("media.cameraSimulatorMessage"),
                [
                  {
                    text: t("common.cancel"),
                    style: "cancel",
                    onPress: () => setPhase("canceled"),
                  },
                  {
                    text: t("media.pickFromLibrary"),
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
      t("media.pickImageTitle"),
      t("labelScan.scanPickSubtitle"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
          onPress: () => setPhase("canceled"),
        },
        {
          text: t("media.takePhoto"),
          onPress: () => {
            void runCameraFlow();
          },
        },
        {
          text: t("media.pickFromLibrary"),
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
        t("onboarding.requiredConditionsTitle"),
        t("onboarding.requiredConditionsMessage"),
      );
      return;
    }
    setSavingConditions(true);
    try {
      const conditionTypes = buildHealthConditionTypesPayload(selectedConditions);
      await authService.updateProfile({ conditionTypes });
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

  const onPrimaryFixed = "#3a4a00";

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  const catalogLoading = !medicalConditionsLoaded;

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <AppHeader variant="inner" title={t("home.dashboard.ctaScanFood")} />

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
              <ScanAnalysisDetailContent
                model={{
                  productTitle: result.productTitle,
                  summaryLine: result.summaryLine,
                  safetyLabel: result.safetyLabel,
                  ingredients: result.ingredients,
                }}
                t={t}
              />
            </ScrollView>

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
