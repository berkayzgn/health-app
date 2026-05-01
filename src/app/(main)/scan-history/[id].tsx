import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert } from "react-native";
import { useFonts } from "expo-font";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import SafeAreaWrapper from "../../../components/SafeAreaWrapper";
import AppHeader from "../../../components/AppHeader";
import ScanAnalysisDetailContent from "../../../components/ScanAnalysisDetailContent";
import { useStore } from "../../../store/useStore";
import {
  getScanHistoryDetail,
  consumeScanHistory,
  clearScanConsumption,
  isBackendScanId,
  type ScanHistoryDetail,
} from "../../../services/labelScanService";
import { displayIngredientName } from "../../../utils/displayIngredientName";

export default function ScanHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";

  const [detail, setDetail] = useState<ScanHistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [portion, setPortion] = useState<0.25 | 0.5 | 1 | 2>(1);
  const [consumeBusy, setConsumeBusy] = useState(false);
  const [consumeOverride, setConsumeOverride] = useState<boolean | null>(null);

  const scanId = typeof id === "string" ? id : id?.[0] ?? "";

  const reloadDetail = useCallback(async () => {
    if (!scanId) return;
    const d = await getScanHistoryDetail(scanId);
    setDetail(d);
  }, [scanId]);

  useFocusEffect(
    useCallback(() => {
      if (!scanId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          setNotFound(false);
          await reloadDetail();
        } catch (e) {
          if (!cancelled) {
            setDetail(null);
            setNotFound(e instanceof Error && e.message === "NOT_FOUND");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [reloadDetail, scanId]),
  );

  useEffect(() => {
    setConsumeOverride(null);
    const p = detail?.portionsConsumed;
    if (p === 0.25 || p === 0.5 || p === 1 || p === 2) setPortion(p);
    else setPortion(1);
  }, [detail?.id, detail?.portionsConsumed]);

  const effectiveConsumed = useMemo(
    () => (consumeOverride !== null ? consumeOverride : Boolean(detail?.consumed)),
    [consumeOverride, detail?.consumed],
  );

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const bottomPad = 16 + Math.max(insets.bottom, 12);

  const onMarkNotConsumed = useCallback(async () => {
    if (!detail?.id || !isBackendScanId(detail.id)) return;
    if (!effectiveConsumed) return;
    setConsumeBusy(true);
    try {
      await clearScanConsumption(detail.id);
      setConsumeOverride(false);
      await reloadDetail();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("auth.errorGeneric");
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setConsumeBusy(false);
    }
  }, [detail?.id, effectiveConsumed, reloadDetail, t]);

  const onMarkConsumed = useCallback(async () => {
    if (!detail?.id || !isBackendScanId(detail.id)) return;
    setConsumeBusy(true);
    try {
      const resp = await consumeScanHistory(detail.id, portion, { locale: lang });
      setConsumeOverride(true);
      await reloadDetail();
      const rules = resp.triggeredRules ?? [];
      if (rules.length > 0) {
        Alert.alert(
          t("labelScan.consumeLimitAlertTitle"),
          rules.map((r) => r.message).join("\n\n"),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("auth.errorGeneric");
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setConsumeBusy(false);
    }
  }, [detail?.id, portion, lang, reloadDetail, t]);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="inner" title={t("scanHistory.detailTitle")} />

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#4e6300" />
            </View>
          ) : notFound || !detail ? (
            <View className="flex-1 px-6 pt-8">
              <Text className="text-on-surface text-base" style={{ fontFamily: "Inter_400Regular" }}>
                {t("scanHistory.notFound")}
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="mt-6 self-start rounded-full bg-primary-fixed px-6 py-3 active:opacity-90"
              >
                <Text className="text-on-primary-fixed font-bold" style={{ fontFamily: "Manrope_700Bold" }}>
                  {t("layout.back")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: bottomPad + 24,
              }}
              showsVerticalScrollIndicator={false}
            >
              <ScanAnalysisDetailContent
                model={{
                  productTitle: detail.productTitle,
                  summaryLine: detail.summaryLine,
                  safetyLabel: detail.safetyLabel,
                  ingredients: detail.ingredients,
                  rawIngredientsFallback:
                    !detail.hasRichDetail && detail.rawIngredients?.length ? detail.rawIngredients : undefined,
                }}
                t={t}
              />

              {isBackendScanId(detail.id) ? (
                <View className="mt-8 rounded-2xl border border-outline-variant/25 bg-surface-container-low p-5 gap-3">
                  <Text className="text-on-surface text-base font-bold" style={{ fontFamily: "Manrope_700Bold" }}>
                    {t("labelScan.consumePrompt")}
                  </Text>
                  <Text className="text-outline text-xs font-semibold" style={{ fontFamily: "Inter_600SemiBold" }}>
                    {t("labelScan.consumePortionHint")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {([
                      [0.25, "portionQuarter"],
                      [0.5, "portionHalf"],
                      [1, "portionOne"],
                      [2, "portionTwo"],
                    ] as const).map(([p, portionKey]) => (
                      <Pressable
                        key={p}
                        onPress={() => setPortion(p)}
                        disabled={consumeBusy || effectiveConsumed}
                        className={`rounded-full px-5 py-3 border ${
                          portion === p
                            ? "bg-primary-fixed border-primary"
                            : "bg-surface-container-high border-outline-variant/40"
                        } ${effectiveConsumed ? "opacity-50" : ""}`}
                      >
                        <Text
                          className={
                            portion === p
                              ? "text-on-primary-fixed font-semibold"
                              : "text-on-surface font-semibold"
                          }
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t(`home.dashboard.${portionKey}` as const)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View className="flex-row gap-3 mt-2">
                    {consumeBusy ? (
                      <View className="flex-1 items-center py-4 justify-center">
                        <ActivityIndicator size="small" color="#4e6300" />
                      </View>
                    ) : (
                      <>
                        <Pressable
                          onPress={() => void onMarkNotConsumed()}
                          disabled={!effectiveConsumed}
                          className="flex-1 rounded-full border border-outline-variant bg-surface-container-highest py-3 items-center"
                          style={{ opacity: !effectiveConsumed ? 0.45 : 1 }}
                        >
                          <Text className="text-on-surface font-bold text-center text-sm">
                            {t("labelScan.consumeNot")}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void onMarkConsumed()}
                          disabled={effectiveConsumed}
                          className="flex-1 rounded-full bg-primary-fixed py-3 items-center"
                          style={{ opacity: effectiveConsumed ? 0.45 : 1 }}
                        >
                          <Text className="text-on-primary-fixed font-bold text-center text-sm">
                            {t("labelScan.consumeYes")}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              ) : null}

              {detail.matchedTriggers.length > 0 ? (
                <View className="mt-10 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
                  <Text
                    className="mb-4 text-[10px] font-bold uppercase tracking-widest text-outline"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t("scanHistory.flaggedTriggers")}
                  </Text>
                  <View className="gap-4">
                    {detail.matchedTriggers.map((tr, i) => (
                      <View key={`${tr.filterToken}-${tr.ingredientName}-${i}`} className="rounded-xl bg-surface-container-lowest p-4">
                        <Text className="text-on-surface font-bold" style={{ fontFamily: "Manrope_700Bold" }}>
                          {displayIngredientName(tr.ingredientName)}
                        </Text>
                        <Text className="text-on-surface-variant text-sm mt-1" style={{ fontFamily: "Inter_400Regular" }}>
                          {tr.filterLabel} · {tr.conditionCodes.join(", ")}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
