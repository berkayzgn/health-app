import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { rgbTripletToRgba } from "../../theme/designRgb";
import type { HomePalette } from "../../hooks/useHomeDashboardData";

interface HomeEmptyStateProps {
  C: HomePalette;
  palette: Record<string, string>;
  theme: "light" | "dark";
  onScan: () => void;
}

export function HomeEmptyState({ C, palette, theme, onScan }: HomeEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          marginBottom: 14,
          padding: 18,
          backgroundColor: C.card,
          borderColor: C.borderHair,
        },
      ]}
    >
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 12 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: rgbTripletToRgba(palette["primary"], theme === "dark" ? 0.22 : 0.12),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="food-apple-outline" size={28} color={C.textStrong} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 6, color: C.textStrong }]}>
            {t("home.dashboard.emptyTodayTitle")}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: C.textMuted }}>
            {t("home.dashboard.emptyTodayLead")}
          </Text>
        </View>
      </View>

      <View style={{ gap: 8, marginBottom: 14 }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: C.textMuted }}>
          • {t("home.dashboard.emptyTodayBullet1")}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: C.textMuted }}>
          • {t("home.dashboard.emptyTodayBullet2")}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: C.textMuted }}>
          • {t("home.dashboard.emptyTodayBullet3")}
        </Text>
      </View>

      <Pressable onPress={onScan} style={[styles.secondaryCta, { borderColor: C.outlineVariant }]}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: C.textStrong }}>
          {t("home.dashboard.emptyTodayCta")}
        </Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color={C.textStrong} />
      </Pressable>
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
  secondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
