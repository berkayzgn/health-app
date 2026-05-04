import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { rgbTripletToRgba } from "../../theme/designRgb";
import type { HomePalette } from "../../hooks/useHomeDashboardData";

interface HomeRiskCardProps {
  C: HomePalette;
  palette: Record<string, string>;
  theme: "light" | "dark";
  risk: { level: "low" | "medium" | "high"; fill: number };
  riskLabelKey: string;
  riskLabelColor: string;
  riskCardBorder: string;
  riskSpectrum: { low: string; mid: string; high: string };
  riskBlurb: string;
  isAuthenticated: boolean;
}

export function HomeRiskCard({
  C,
  palette,
  theme,
  risk,
  riskLabelKey,
  riskLabelColor,
  riskCardBorder,
  riskSpectrum,
  riskBlurb,
  isAuthenticated,
}: HomeRiskCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [riskBarTrackW, setRiskBarTrackW] = useState(0);

  return (
    <View
      style={[
        styles.card,
        {
          marginBottom: 14,
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: C.card,
          borderColor: riskCardBorder,
          borderWidth: risk.level === "low" ? StyleSheet.hairlineWidth : 1,
        },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <Text style={[styles.sectionTitle, { flex: 1, marginRight: 12, color: C.textStrong }]}>
          {t("home.dashboard.riskCardTitle")}
        </Text>
        <Text style={{ fontWeight: "800", fontSize: 14, color: riskLabelColor }}>
          {t(riskLabelKey as Parameters<typeof t>[0])}
        </Text>
      </View>

      <Text style={{ fontSize: 14, lineHeight: 20, color: C.textMuted, marginBottom: 10 }}>
        {riskBlurb}
      </Text>

      <View
        onLayout={(e) => setRiskBarTrackW(e.nativeEvent.layout.width)}
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: rgbTripletToRgba(palette["on-surface"], theme === "dark" ? 0.22 : 0.12),
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <View style={{ height: "100%", width: `${risk.fill * 100}%`, overflow: "hidden" }}>
          {riskBarTrackW > 0 ? (
            <Svg width={riskBarTrackW} height={10} viewBox={`0 0 ${riskBarTrackW} 10`}>
              <Defs>
                <SvgLinearGradient
                  id="homeRiskSpectrumFill"
                  x1="0"
                  y1="0"
                  x2={riskBarTrackW}
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={riskSpectrum.low} />
                  <Stop offset="0.48" stopColor={riskSpectrum.mid} />
                  <Stop offset="1" stopColor={riskSpectrum.high} />
                </SvgLinearGradient>
              </Defs>
              <Rect x={0} y={0} width={riskBarTrackW} height={10} rx={4} fill="url(#homeRiskSpectrumFill)" />
            </Svg>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.riskAxis, { color: riskSpectrum.low }]}>{t("home.dashboard.riskAxisLow")}</Text>
        <Text style={[styles.riskAxis, { color: riskSpectrum.mid }]}>{t("home.dashboard.riskAxisMid")}</Text>
        <Text style={[styles.riskAxis, { color: riskSpectrum.high }]}>{t("home.dashboard.riskAxisHigh")}</Text>
      </View>

      {isAuthenticated ? (
        <Pressable
          onPress={() => router.push("/scan-history")}
          hitSlop={8}
          style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.linkOnBackground }}>
            {t("home.dashboard.riskSeeHistory")}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={C.linkOnBackground} />
        </Pressable>
      ) : null}
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
  riskAxis: {
    fontSize: 12,
    fontWeight: "500",
  },
});
