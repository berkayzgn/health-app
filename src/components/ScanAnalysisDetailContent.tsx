import { View, Text } from "react-native";
import type { TFunction } from "i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import type { ScanIngredient, SafetyLabel } from "../services/labelScanService";
import { displayIngredientName } from "../utils/displayIngredientName";

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
  return (
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
          </View>
        </View>

        <View className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
          <Text
            className="mb-3 text-[10px] font-bold uppercase tracking-widest text-outline"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {t("labelScan.extractedIngredientsEn")}
          </Text>
          <Text className="text-base leading-relaxed text-on-surface" style={{ fontFamily: "Inter_400Regular" }}>
            {result.ingredients.length > 0
              ? result.ingredients.map((ing) => displayIngredientName(ing.name)).join(", ")
              : result.rawIngredientsFallback?.length
                ? result.rawIngredientsFallback.map((s) => displayIngredientName(s)).join(", ")
                : "—"}
          </Text>
        </View>
      </View>

      <View>
        <View className="mb-8 flex-row items-baseline justify-between">
          <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_700Bold" }}>
            {t("labelScan.ingredientBreakdown")}
          </Text>
          <Text className="text-sm font-medium text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
            {t("labelScan.ingredientsCount", { count: result.ingredients.length })}
          </Text>
        </View>
        {result.ingredients.length === 0 && !result.rawIngredientsFallback?.length ? (
          <Text className="text-on-surface-variant text-sm" style={{ fontFamily: "Inter_400Regular" }}>
            {t("scanHistory.detailNoBreakdown")}
          </Text>
        ) : result.ingredients.length === 0 ? null : (
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
        )}
      </View>
    </View>
  );
}
