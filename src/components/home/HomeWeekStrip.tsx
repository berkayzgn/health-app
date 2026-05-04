import { View, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { rgbTripletToRgba } from "../../theme/designRgb";
import type { HomePalette, DayTone } from "../../hooks/useHomeDashboardData";

interface WeekDay {
  key: string;
  tone: DayTone;
  label: string;
}

interface HomeWeekStripProps {
  C: HomePalette;
  palette: Record<string, string>;
  theme: "light" | "dark";
  weekStrip: WeekDay[];
}

export function HomeWeekStrip({ C, palette, theme, weekStrip }: HomeWeekStripProps) {
  const { t } = useTranslation();

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.sectionTitle, { marginBottom: 6, color: C.textStrong }]}>
        {t("home.dashboard.weekActivityTitle")}
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 16, color: C.textSubtle, marginBottom: 10 }}>
        {t("home.dashboard.weekActivitySubtitle")}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        {weekStrip.map((d) => {
          const dotBg =
            d.tone === "bad"
              ? C.badgeAvoidBg
              : d.tone === "mid"
                ? C.badgeCautionBg
                : d.tone === "good"
                  ? C.badgeSafeBg
                  : "transparent";
          const dotBorder =
            d.tone === "empty"
              ? rgbTripletToRgba(palette["on-surface"], theme === "dark" ? 0.35 : 0.2)
              : "transparent";
          const iconColor =
            d.tone === "bad"
              ? C.badgeAvoidText
              : d.tone === "mid"
                ? C.badgeCautionText
                : d.tone === "good"
                  ? C.badgeSafeText
                  : C.textSubtle;

          return (
            <View key={d.key} style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: dotBg,
                  borderWidth: d.tone === "empty" ? StyleSheet.hairlineWidth : 0,
                  borderColor: dotBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {d.tone === "empty" ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: rgbTripletToRgba(palette["on-surface"], 0.25),
                    }}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={d.tone === "bad" ? "alert" : d.tone === "mid" ? "minus" : "check"}
                    size={14}
                    color={iconColor}
                  />
                )}
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: "700",
                  color: C.textSubtle,
                  textTransform: "uppercase",
                }}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
});
