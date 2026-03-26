import { useCallback, useEffect, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";
import {
  MOCK_LABEL_SCAN_RESULT,
  type LabelScanResult,
} from "../../utils/labelScanMock";
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
  launchCameraForLabelScan,
  launchImageLibrary,
} from "../../utils/mediaImagePick";

type Phase = "idle" | "analyzing" | "result" | "canceled";

const ANALYZE_DELAY_MS = 900;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<LabelScanResult | null>(null);

  const runAnalyze = useCallback(async (_imageUri: string) => {
    setPhase("analyzing");
    await delay(ANALYZE_DELAY_MS);
    setResult(MOCK_LABEL_SCAN_RESULT);
    setPhase("result");
  }, []);

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
                  { text: t("common.cancel"), style: "cancel", onPress: () => setPhase("canceled") },
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

  useEffect(() => {
    showPickSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const onRetry = useCallback(() => {
    showPickSource();
  }, [showPickSource]);

  const onScanAgain = useCallback(() => {
    setResult(null);
    setPhase("idle");
    showPickSource();
  }, [showPickSource]);

  const onAddToMeal = useCallback(() => {
    Alert.alert(t("auth.comingSoon"));
  }, [t]);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <AppHeader variant="inner" title={t("home.dashboard.ctaScanMeal")} />

        {phase === "analyzing" ? (
          <View className="flex-1 items-center justify-center px-8">
            <ActivityIndicator size="large" color="#4e6300" />
            <Text
              className="mt-6 text-center text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("labelScan.analyzing")}
            </Text>
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
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={28}
                            color="#4a5e00"
                          />
                          <Text
                            className="text-2xl text-on-primary-container"
                            style={{ fontFamily: "Manrope_800ExtraBold" }}
                          >
                            {t("labelScan.safe")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
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
                    {result.ingredients.map((ing) => (
                      <View
                        key={ing.name}
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
                            {ing.name}
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

        {phase === "idle" && !result ? <View className="flex-1 bg-surface" /> : null}
      </SafeAreaWrapper>
    </View>
  );
}
