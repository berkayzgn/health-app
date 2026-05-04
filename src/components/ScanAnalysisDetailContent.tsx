import { useMemo } from "react";
import { View, Text } from "react-native";
import type { TFunction } from "i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import type { ScanIngredient, SafetyLabel } from "../services/labelScanService";
import { displayIngredientName, sanitizeScanDisplayText } from "../utils/displayIngredientName";

export type ScanAnalysisDetailModel = {
  productTitle: string;
  summaryLine: string;
  safetyLabel: SafetyLabel;
  ingredients: ScanIngredient[];
  /** Eski kayıtlar: AI dökümü yoksa ham içindekiler listesi */
  rawIngredientsFallback?: string[];
};

type Props = {
  model: ScanAnalysisDetailModel;
  t: TFunction;
};

export default function ScanAnalysisDetailContent({ model, t }: Props) {
  const result = model;

  const breakdownItems = useMemo((): ScanIngredient[] => {
    if (result.ingredients.length > 0) {
      return [...result.ingredients].sort((a, b) => {
        if (a.variant === b.variant) return 0;
        return a.variant === "warning" ? -1 : 1;
      });
    }
    const raw = result.rawIngredientsFallback;
    if (raw?.length) {
      return raw.map((name) => ({
        name,
        variant: "normal" as const,
        tag: t("scanHistory.archivedIngredientTag"),
        description: t("scanHistory.fallbackIngredientHint"),
      }));
    }
    return [];
  }, [result.ingredients, result.rawIngredientsFallback, t]);

  return (
    <View className="gap-6">
      <View className="flex-col gap-4">
        <View className="relative flex-1 overflow-hidden rounded-2xl bg-surface-container-lowest p-8 shadow-ambient">
          <View className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-fixed opacity-10" />
          <View className="relative z-10">
            <Text
              className="mb-2 text-sm font-bold uppercase tracking-wide text-outline"
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
              className="mb-4 max-w-lg text-on-surface-variant"
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
                <Text className="text-2xl text-yellow-800" style={{ fontFamily: "Manrope_800ExtraBold" }}>
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

            <View className="mt-4 flex-row gap-3 rounded-xl border border-outline-variant/25 bg-surface-container-low px-4 py-3">
              <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#767777" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text
                  className="mb-1 text-[11px] font-bold uppercase tracking-wider text-outline"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {t("labelScan.aiDisclaimerTitle")}
                </Text>
                <Text className="text-sm leading-relaxed text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
                  {t("labelScan.aiDisclaimerBody")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View>
        <View className="mb-4 flex-row items-baseline justify-between">
          <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_700Bold" }}>
            {t("labelScan.ingredientBreakdown")}
          </Text>
          <Text className="text-sm font-medium text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
            {t("labelScan.ingredientsCount", { count: breakdownItems.length })}
          </Text>
        </View>
        {breakdownItems.length === 0 ? (
          <Text className="text-on-surface-variant text-sm" style={{ fontFamily: "Inter_400Regular" }}>
            {t("scanHistory.detailNoBreakdown")}
          </Text>
        ) : (
          <View className="gap-4">
            {breakdownItems.map((ing, idx) => (
              <View
                key={`${ing.name}-${idx}`}
                className={`w-full p-6 ${
                  ing.variant === "warning"
                    ? "rounded-xl border-l-4 border-error bg-error-container/10"
                    : "rounded-xl border-l-4 border-primary/20 bg-surface-container-lowest"
                }`}
              >
                <View className="mb-4 flex-row items-start justify-between gap-2">
                  <Text className="flex-1 text-lg text-on-surface" style={{ fontFamily: "Manrope_700Bold" }}>
                    {displayIngredientName(ing.name)}
                  </Text>
                  <View
                    className={`rounded px-2 py-1 ${
                      ing.variant === "warning" ? "bg-error-container" : "bg-surface-container"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        ing.variant === "warning" ? "text-on-error-container" : "text-on-surface-variant"
                      }`}
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {ing.tag}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm leading-relaxed text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
                  {sanitizeScanDisplayText(ing.description)}{" "}
                  {ing.cautionAmount ? (
                    <Text className="font-bold text-error">
                      {ing.cautionAmount ? sanitizeScanDisplayText(ing.cautionAmount) : null}
                    </Text>
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
        )}
      </View>
    </View>
  );
}
