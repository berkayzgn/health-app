import { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { HomeRiskCard } from "../../components/home/HomeRiskCard";
import { HomeTodaySummary } from "../../components/home/HomeTodaySummary";
import { HomeWeekStrip } from "../../components/home/HomeWeekStrip";
import { HomeEmptyState } from "../../components/home/HomeEmptyState";
import { useHomeDashboardData } from "../../hooks/useHomeDashboardData";
import { rgbTripletToRgba } from "../../theme/designRgb";
import { useStore } from "../../store/useStore";

const R = { card: 12, pill: 20 };

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);

  const {
    C,
    palette,
    lang,
    isAuthenticated,
    needsProfile,
    historyLoading,
    greetingLine,
    subtitleLine,
    hideGreetingSubtext,
    todayStats,
    safeRate,
    safeRateFooterText,
    usageFractionText,
    usagePlanCaption,
    risk,
    riskLabelKey,
    riskSpectrum,
    riskLabelColor,
    riskCardBorder,
    riskBlurb,
    recentItems,
    topConcernTitle,
    tipText,
    weekStrip,
  } = useHomeDashboardData();

  const bottomPad = 16 + Math.max(insets.bottom, 12);

  const goScan = () =>
    router.push({
      pathname: "/scan",
      params: { ts: String(Date.now()), scanKind: "auto" },
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper style={{ flex: 1, backgroundColor: C.pageBg }} edges={["top"]}>
        <AppHeader variant="home" limeBrand />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 20,
            paddingBottom: bottomPad,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <Text
            style={[styles.heroTitle, { marginBottom: hideGreetingSubtext ? 16 : 8, color: C.textStrong }]}
            numberOfLines={2}
          >
            {greetingLine}
          </Text>
          {!hideGreetingSubtext ? (
            <Text style={[styles.bodyMuted, { marginBottom: 6, color: C.textMuted }]}>{subtitleLine}</Text>
          ) : null}
          {isAuthenticated && !hideGreetingSubtext ? (
            <Text style={[styles.heroSub, { marginBottom: 18, color: C.textSubtle }]}>
              {t("home.dashboard.heroSubtext")}
            </Text>
          ) : null}

          {/* Primary CTA */}
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Pressable
              onPress={goScan}
              style={[
                styles.card,
                {
                  backgroundColor: C.lime,
                  borderColor: "rgba(44,54,0,0.12)",
                  paddingVertical: 26,
                  paddingHorizontal: 18,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: R.card,
                    backgroundColor: C.onLime,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="camera" size={32} color={C.lime} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.ctaTitle, { color: C.onLime }]}>{t("home.dashboard.scanCtaTitle")}</Text>
                  <Text style={[styles.ctaSub, { color: C.onLime, opacity: 0.9 }]}>
                    {t("home.dashboard.scanCtaSubtitle")}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={26} color={C.onLime} />
              </View>
            </Pressable>
          </View>

          {/* Empty state */}
          {isAuthenticated && !historyLoading && todayStats.today.length === 0 ? (
            <HomeEmptyState C={C} palette={palette} theme={theme} onScan={goScan} />
          ) : null}

          {/* Profile completion prompt */}
          {isAuthenticated && needsProfile ? (
            <View
              style={[
                styles.card,
                {
                  marginBottom: 14,
                  padding: 16,
                  backgroundColor: rgbTripletToRgba(palette["tertiary"], theme === "dark" ? 0.12 : 0.08),
                  borderColor: rgbTripletToRgba(palette["tertiary"], 0.35),
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { marginBottom: 6, color: C.textStrong }]}>
                {t("home.dashboard.profileCompleteTitle")}
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: C.textMuted, marginBottom: 12 }}>
                {t("home.dashboard.profileCompleteBody")}
              </Text>
              <Pressable
                onPress={() => router.push("/profile")}
                style={[styles.secondaryCta, { borderColor: C.outlineVariant, backgroundColor: C.card }]}
              >
                <Text style={{ fontSize: 15, fontWeight: "800", color: C.textStrong }}>
                  {t("home.dashboard.profileCompleteCta")}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={C.textStrong} />
              </Pressable>
            </View>
          ) : null}

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <View style={[styles.statBox, { flex: 1, backgroundColor: C.statCardBg, borderColor: C.borderHair }]}>
              <Text style={[styles.statNumber, { color: C.textStrong }]}>{usageFractionText}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>{t("home.dashboard.statsDailyScansLabel")}</Text>
              <Text style={[styles.statTrend, { color: C.textSubtle }]} numberOfLines={2}>
                {usagePlanCaption}
              </Text>
            </View>
            <View style={[styles.statBox, { flex: 1, backgroundColor: C.statCardBg, borderColor: C.borderHair }]}>
              {historyLoading ? (
                <ActivityIndicator color={C.spinnerOnBackground} />
              ) : (
                <>
                  <Text style={[styles.statNumber, { color: C.textStrong }]}>
                    {safeRate !== null ? `${safeRate}%` : "—"}
                  </Text>
                  <Text style={[styles.statLabel, { color: C.textMuted }]}>
                    {t("home.dashboard.statsSafeRateLabel")}
                  </Text>
                  {safeRateFooterText ? (
                    <Text style={[styles.statTrend, { color: C.textSubtle }]} numberOfLines={1}>
                      {safeRateFooterText}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </View>

          {/* Today's summary */}
          {isAuthenticated && todayStats.today.length > 0 ? (
            <HomeTodaySummary
              C={C}
              safe={todayStats.safe}
              caution={todayStats.caution}
              avoid={todayStats.avoid}
              topConcernTitle={topConcernTitle}
            />
          ) : null}

          {/* Risk card */}
          <HomeRiskCard
            C={C}
            palette={palette}
            theme={theme}
            risk={risk}
            riskLabelKey={riskLabelKey}
            riskLabelColor={riskLabelColor}
            riskCardBorder={riskCardBorder}
            riskSpectrum={riskSpectrum}
            riskBlurb={riskBlurb}
            isAuthenticated={isAuthenticated}
          />

          {/* Tip of the day */}
          {isAuthenticated ? (
            <View
              style={[
                styles.card,
                {
                  marginBottom: 14,
                  padding: 16,
                  backgroundColor: C.statCardBg,
                  borderColor: C.borderHair,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={C.textStrong} />
                <Text style={[styles.sectionTitle, { flex: 1, color: C.textStrong }]}>
                  {t("home.dashboard.tipTitle")}
                </Text>
              </View>
              <Text style={{ fontSize: 15, lineHeight: 22, color: C.textMuted }}>{tipText}</Text>
            </View>
          ) : null}

          {/* Last 7 days */}
          {isAuthenticated && !historyLoading ? (
            <HomeWeekStrip C={C} palette={palette} theme={theme} weekStrip={weekStrip} />
          ) : null}

          {/* Recent scans */}
          <RecentScansSection
            C={C}
            lang={lang}
            historyLoading={historyLoading}
            recentItems={recentItems}
            isAuthenticated={isAuthenticated}
            hasScansToday={todayStats.today.length > 0}
            onSeeAll={() => router.push("/scan-history")}
            onScanPress={(id) => router.push(`/scan-history/${id}`)}
            t={t}
          />
        </ScrollView>
      </SafeAreaWrapper>
    </View>
  );
}

// ── Recent scans (small enough to stay inline but could be extracted later) ───

import type { ScanHistoryItem } from "../../services/labelScanService";
import type { TFunction } from "i18next";

function RecentScansSection({
  C,
  lang,
  historyLoading,
  recentItems,
  isAuthenticated,
  hasScansToday,
  onSeeAll,
  onScanPress,
  t,
}: {
  C: ReturnType<typeof useHomeDashboardData>["C"];
  lang: string;
  historyLoading: boolean;
  recentItems: ScanHistoryItem[];
  isAuthenticated: boolean;
  hasScansToday: boolean;
  onSeeAll: () => void;
  onScanPress: (id: string) => void;
  t: TFunction;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={[styles.sectionTitle, { color: C.textStrong }]}>
          {t("home.dashboard.recentTitleNew")}
        </Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={{ fontWeight: "600", fontSize: 14, color: C.linkOnBackground }}>
            {t("home.dashboard.recentSeeAllLink")}
          </Text>
        </Pressable>
      </View>

      {historyLoading ? (
        <ActivityIndicator color={C.spinnerOnBackground} style={{ paddingVertical: 16 }} />
      ) : recentItems.length === 0 ? (
        isAuthenticated && !hasScansToday ? null : (
          <Text style={{ fontSize: 15, lineHeight: 22, color: C.textMuted, paddingVertical: 8 }}>
            {t("home.dashboard.recentEmptyHint")}
          </Text>
        )
      ) : (
        <View
          style={[
            styles.card,
            {
              paddingVertical: 0,
              overflow: "hidden",
              backgroundColor: C.card,
              borderColor: C.borderHair,
            },
          ]}
        >
          {recentItems.map((item, idx) => {
            const badge =
              item.safetyLabel === "safe"
                ? {
                    bg: C.badgeSafeBg,
                    fg: C.badgeSafeText,
                    key: "home.dashboard.badgeSafe" as const,
                    icon: "shield-check" as const,
                  }
                : item.safetyLabel === "caution"
                  ? {
                      bg: C.badgeCautionBg,
                      fg: C.badgeCautionText,
                      key: "home.dashboard.badgeCaution" as const,
                      icon: "alert-decagram" as const,
                    }
                  : {
                      bg: C.badgeAvoidBg,
                      fg: C.badgeAvoidText,
                      key: "home.dashboard.badgeAvoid" as const,
                      icon: "alert-octagon" as const,
                    };
            const dateStr = new Date(item.scannedAt).toLocaleString(
              lang === "tr" ? "tr-TR" : "en-US",
              { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
            );
            return (
              <Pressable
                key={item.id}
                onPress={() => onScanPress(item.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                  borderTopColor: C.borderHair,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: badge.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialCommunityIcons name={badge.icon} size={24} color={badge.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: C.textStrong }} numberOfLines={1}>
                    {item.productTitle || "—"}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textSubtle, marginTop: 3 }}>{dateStr}</Text>
                </View>
                <View
                  style={{
                    borderRadius: R.pill,
                    backgroundColor: badge.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: badge.fg }}>{t(badge.key)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  bodyMuted: {
    fontSize: 17,
    lineHeight: 26,
  },
  card: {
    borderRadius: R.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ctaTitle: {
    fontSize: 21,
    fontWeight: "800",
  },
  ctaSub: {
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  statBox: {
    borderRadius: R.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 22,
    paddingHorizontal: 16,
    minHeight: 142,
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 34,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  statTrend: {
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
  },
  secondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: R.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
