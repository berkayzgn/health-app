import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { HomePalette } from "../../hooks/useHomeDashboardData";

interface HomeTodaySummaryProps {
  C: HomePalette;
  safe: number;
  caution: number;
  avoid: number;
  topConcernTitle: string | null;
}

export function HomeTodaySummary({ C, safe, caution, avoid, topConcernTitle }: HomeTodaySummaryProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          marginBottom: 14,
          padding: 16,
          backgroundColor: C.card,
          borderColor: C.borderHair,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { marginBottom: 12, color: C.textStrong }]}>
        {t("home.dashboard.sectionTodaySummary")}
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <View style={[styles.summaryPill, { backgroundColor: C.badgeSafeBg, flex: 1 }]}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.badgeSafeText }}>{safe}</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.badgeSafeText, marginTop: 2 }}>
            {t("home.dashboard.badgeSafe")}
          </Text>
        </View>

        <View style={[styles.summaryPill, { backgroundColor: C.badgeCautionBg, flex: 1 }]}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.badgeCautionText }}>{caution}</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.badgeCautionText, marginTop: 2 }}>
            {t("home.dashboard.badgeCaution")}
          </Text>
        </View>

        <View style={[styles.summaryPill, { backgroundColor: C.badgeAvoidBg, flex: 1 }]}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.badgeAvoidText }}>{avoid}</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.badgeAvoidText, marginTop: 2 }}>
            {t("home.dashboard.badgeAvoid")}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, lineHeight: 17, color: C.textSubtle, marginBottom: 12 }}>
        {t("home.dashboard.todaySummaryLegend")}
      </Text>

      <Text style={{ fontSize: 12, fontWeight: "700", color: C.textSubtle, marginBottom: 4 }}>
        {t("home.dashboard.todaySummaryTop")}
      </Text>
      <Text style={{ fontSize: 15, fontWeight: "700", color: C.textStrong }} numberOfLines={2}>
        {topConcernTitle ?? t("home.dashboard.todaySummaryTopNone")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryPill: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
