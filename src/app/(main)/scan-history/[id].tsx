import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
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
import { getScanHistoryDetail, type ScanHistoryDetail } from "../../../services/labelScanService";
import { displayIngredientName } from "../../../utils/displayIngredientName";

export default function ScanHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const [detail, setDetail] = useState<ScanHistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const scanId = typeof id === "string" ? id : id?.[0] ?? "";

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
          const d = await getScanHistoryDetail(scanId);
          if (!cancelled) setDetail(d);
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
    }, [scanId]),
  );

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const bottomPad = 16 + Math.max(insets.bottom, 12);

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
