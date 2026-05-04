/**
 * ConsumeBlock — shared consume-portion UI used in both the live scan result
 * screen (scan.tsx) and the scan-history detail screen ([id].tsx).
 */
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

export type ConsumePortions = 0.25 | 0.5 | 1 | 2;

interface ConsumeBlockProps {
  portion: ConsumePortions;
  onSelectPortion: (p: ConsumePortions) => void;
  consumeBusy: boolean;
  effectiveConsumed: boolean;
  onMarkConsumed: () => void;
  onMarkNotConsumed: () => void;
}

const PORTION_KEYS: [ConsumePortions, string][] = [
  [0.25, "portionQuarter"],
  [0.5, "portionHalf"],
  [1, "portionOne"],
  [2, "portionTwo"],
];

export function ConsumeBlock({
  portion,
  onSelectPortion,
  consumeBusy,
  effectiveConsumed,
  onMarkConsumed,
  onMarkNotConsumed,
}: ConsumeBlockProps) {
  const { t } = useTranslation();

  return (
    <View className="mt-8 rounded-2xl border border-outline-variant/25 bg-surface-container-low p-5 gap-3">
      <Text
        className="text-on-surface text-base font-bold"
        style={{ fontFamily: "Manrope_700Bold" }}
      >
        {t("labelScan.consumePrompt")}
      </Text>
      <Text
        className="text-outline text-xs font-semibold"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {t("labelScan.consumePortionHint")}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {PORTION_KEYS.map(([p, portionKey]) => (
          <Pressable
            key={p}
            onPress={() => onSelectPortion(p)}
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
              onPress={onMarkNotConsumed}
              disabled={!effectiveConsumed}
              className="flex-1 rounded-full border border-outline-variant bg-surface-container-highest py-3 items-center"
              style={{ opacity: !effectiveConsumed ? 0.45 : 1 }}
            >
              <Text className="text-on-surface font-bold text-center text-sm">
                {t("labelScan.consumeNot")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onMarkConsumed}
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
  );
}
