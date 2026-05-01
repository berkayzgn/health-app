import { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";
import {
  getScanHistory,
  type ScanHistoryItem,
  fetchDailySummary,
  fetchWeeklyRulesPlaceholder,
  type DailySummaryResponse,
} from "../../services/labelScanService";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex, rgbTripletToRgba } from "../../theme/designRgb";

const R = { card: 12, pill: 20 };

function dashboardGreetingSlot(hour: number) {
  if (hour >= 5 && hour < 12) return "Morning" as const;
  if (hour >= 12 && hour < 17) return "Afternoon" as const;
  if (hour >= 17 && hour < 22) return "Evening" as const;
  return "Night" as const;
}

function isSameLocalCalendarDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function countTodayBySafety(items: ScanHistoryItem[], ref: Date) {
  const today = items.filter((i) => isSameLocalCalendarDay(i.scannedAt, ref));
  let safe = 0;
  let caution = 0;
  let avoid = 0;
  for (const t of today) {
    if (t.safetyLabel === "safe") safe += 1;
    else if (t.safetyLabel === "caution") caution += 1;
    else avoid += 1;
  }
  return { today, safe, caution, avoid };
}

function safeRatePercent(items: ScanHistoryItem[]): number | null {
  if (items.length === 0) return null;
  const safe = items.filter((i) => i.safetyLabel === "safe").length;
  return Math.round((safe / items.length) * 100);
}

function safeRateInWindow(items: ScanHistoryItem[], start: Date, end: Date): number | null {
  const win = items.filter((i) => {
    const d = new Date(i.scannedAt);
    return d >= start && d < end;
  });
  return safeRatePercent(win);
}

function riskFromToday(items: ScanHistoryItem[], ref: Date): { level: "low" | "medium" | "high"; fill: number } {
  const { today } = countTodayBySafety(items, ref);
  if (today.length === 0) return { level: "low", fill: 0.12 };

  let sum = 0;
  for (const s of today) {
    if (s.safetyLabel === "safe") sum += 0;
    else if (s.safetyLabel === "caution") sum += 40;
    else sum += 100;
  }
  const avg = sum / today.length;
  if (avg < 28) return { level: "low", fill: 0.2 };
  if (avg < 70) return { level: "medium", fill: 0.52 };
  return { level: "high", fill: 0.92 };
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const refreshProfile = useStore((s) => s.refreshProfile);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const authUser = useStore((s) => s.authUser);
  const userProfile = useStore((s) => s.userProfile);
  const theme = useStore((s) => s.theme);

  const palette = theme === "dark" ? DARK_RGB : LIGHT_RGB;
  const C = useMemo(() => {
    const onSurface = rgbTripletToHex(palette["on-surface"]);
    const surface = rgbTripletToHex(palette.surface);
    const surfaceContainer = rgbTripletToHex(palette["surface-container-lowest"]);
    const outlineVariant = rgbTripletToHex(palette["outline-variant"]);
    const lime = "#BFFF00";
    const onLime = "#2C3600";
    return {
      pageBg: surface,
      card: surfaceContainer,
      lime,
      onLime,
      borderHair: rgbTripletToRgba(palette["on-surface"], 0.12),
      statCardBg: rgbTripletToRgba(palette["on-surface"], theme === "dark" ? 0.10 : 0.06),
      textStrong: onSurface,
      textMuted: rgbTripletToRgba(palette["on-surface"], 0.72),
      textSubtle: rgbTripletToRgba(palette["on-surface"], 0.55),
      outlineVariant,
      badgeSafeBg: theme === "dark" ? "rgba(191,255,0,0.16)" : "#EAF3DE",
      badgeSafeText: theme === "dark" ? lime : "#3B6D11",
      badgeCautionBg: theme === "dark" ? "rgba(255,206,92,0.18)" : "#FAEEDA",
      badgeCautionText: theme === "dark" ? "#FFCE5C" : "#854F0B",
      badgeAvoidBg: theme === "dark" ? "rgba(255,107,107,0.18)" : "#FCEBEB",
      badgeAvoidText: theme === "dark" ? "#FF6B6B" : "#A32D2D",
    };
  }, [palette, theme]);

  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";
  const [greetingRefresh, setGreetingRefresh] = useState(0);
  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState<DailySummaryResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [weeklyRuleCount, setWeeklyRuleCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setGreetingRefresh((n) => n + 1);
      void refreshProfile();
    }, [refreshProfile]),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setHistoryLoading(true);
          const list = await getScanHistory(120);
          if (!cancelled) setHistoryItems(list);
        } catch {
          if (!cancelled) setHistoryItems([]);
        } finally {
          if (!cancelled) setHistoryLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setDailySummary(null);
        setWeeklyRuleCount(0);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          setDailyLoading(true);
          const [daily, weekly] = await Promise.all([
            fetchDailySummary({ locale: lang === "tr" ? "tr" : "en" }),
            fetchWeeklyRulesPlaceholder().catch(() => null),
          ]);
          if (cancelled) return;
          setDailySummary(daily);
          setWeeklyRuleCount(weekly?.rules?.length ?? 0);
        } catch {
          if (!cancelled) {
            setDailySummary(null);
            setWeeklyRuleCount(0);
          }
        } finally {
          if (!cancelled) setDailyLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, lang]),
  );

  const bottomPad = 16 + Math.max(insets.bottom, 12);
  const now = useMemo(() => new Date(), [greetingRefresh]);

  const greetingForName = useMemo(() => {
    const savedName = userProfile?.name?.trim() || authUser?.name?.trim() || "";
    if (!savedName) return null;
    return savedName.split(/\s+/)[0] || savedName;
  }, [userProfile?.name, authUser?.name]);

  const greetingLine = useMemo(() => {
    const hour = now.getHours();
    const slot = dashboardGreetingSlot(hour);
    if (greetingForName) {
      return t(`home.dashboard.greeting${slot}Named` as const, { name: greetingForName });
    }
    return t(`home.dashboard.greeting${slot}` as const);
  }, [greetingRefresh, t, greetingForName, now]);

  const todayStats = useMemo(() => countTodayBySafety(historyItems, now), [historyItems, now]);

  const subtitleLine = useMemo(() => {
    if (todayStats.today.length === 0) {
      return t("home.dashboard.summaryNoScansToday");
    }
    return t("home.dashboard.summaryToday", {
      safe: todayStats.safe,
      caution: todayStats.caution,
      avoid: todayStats.avoid,
    });
  }, [todayStats, t]);

  const totalScans = historyItems.length;
  const safeRate = safeRatePercent(historyItems);

  const trendText = useMemo(() => {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const prevEnd = new Date(start);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);

    const cur = safeRateInWindow(historyItems, start, end);
    const prev = safeRateInWindow(historyItems, prevStart, prevEnd);
    if (cur === null || prev === null) return t("home.dashboard.statsTrendNeutral");
    if (cur > prev) return t("home.dashboard.statsTrendUp", { delta: cur - prev });
    if (cur < prev) return t("home.dashboard.statsTrendDown", { delta: prev - cur });
    return t("home.dashboard.statsTrendNeutral");
  }, [historyItems, now, t]);

  const risk = useMemo(() => riskFromToday(historyItems, now), [historyItems, now]);
  const riskLabelKey =
    risk.level === "low"
      ? ("home.dashboard.riskLow" as const)
      : risk.level === "medium"
        ? ("home.dashboard.riskMedium" as const)
        : ("home.dashboard.riskHigh" as const);

  const recentItems = useMemo(() => historyItems.slice(0, 3), [historyItems]);

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
            paddingTop: 16,
            paddingBottom: bottomPad,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <Text style={[styles.heroTitle, { marginBottom: 6, color: C.textStrong }]} numberOfLines={2}>
            {greetingLine}
          </Text>
          <Text style={[styles.bodyMuted, { marginBottom: 12, color: C.textMuted }]}>{subtitleLine}</Text>

          {/* Scan CTAs */}
          <View style={{ gap: 12, marginBottom: 14 }}>
            <Pressable
              onPress={goScan}
              style={[
                styles.card,
                {
                  backgroundColor: C.lime,
                  borderColor: "rgba(44,54,0,0.12)",
                  paddingVertical: 18,
                  paddingHorizontal: 16,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: R.card,
                    backgroundColor: C.onLime,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="camera" size={28} color={C.lime} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.ctaTitle, { color: C.onLime }]}>{t("home.dashboard.scanCtaTitle")}</Text>
                  <Text style={[styles.ctaSub, { color: C.onLime, opacity: 0.9 }]}>
                    {t("home.dashboard.scanCtaSubtitle")}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={C.onLime} />
              </View>
            </Pressable>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <View style={[styles.statBox, { flex: 1, backgroundColor: C.statCardBg, borderColor: C.borderHair }]}>
              {historyLoading ? (
                <ActivityIndicator color={C.onLime} />
              ) : (
                <>
                  <Text style={[styles.statNumber, { color: C.textStrong }]}>{totalScans}</Text>
                  <Text style={[styles.statLabel, { color: C.textMuted }]}>{t("home.dashboard.statsTotalLabel")}</Text>
                  <Text style={[styles.statTrend, { color: C.textSubtle }]}>{trendText}</Text>
                </>
              )}
            </View>
            <View style={[styles.statBox, { flex: 1, backgroundColor: C.statCardBg, borderColor: C.borderHair }]}>
              {historyLoading ? (
                <ActivityIndicator color={C.onLime} />
              ) : (
                <>
                  <Text style={[styles.statNumber, { color: C.textStrong }]}>{safeRate !== null ? `${safeRate}%` : "—"}</Text>
                  <Text style={[styles.statLabel, { color: C.textMuted }]}>{t("home.dashboard.statsSafeRateLabel")}</Text>
                  <Text style={[styles.statTrend, { color: C.textSubtle }]}>{t("home.dashboard.statsAllTimeHint")}</Text>
                </>
              )}
            </View>
          </View>

          {isAuthenticated ? (
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.sectionTitle, { color: C.textStrong, marginBottom: 10 }]}>
                {t("home.dashboard.dailyIntakeTitle")}
              </Text>
              {dailyLoading ? (
                <ActivityIndicator color={C.onLime} style={{ paddingVertical: 12 }} />
              ) : !dailySummary || dailySummary.conditions.every((c) => c.rows.length === 0) ? (
                <Text style={{ fontSize: 14, lineHeight: 20, color: C.textMuted }}>
                  {t("home.dashboard.dailyIntakeEmpty")}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {dailySummary.conditions
                    .filter((c) => c.rows.length > 0)
                    .map((cond) => (
                      <View
                        key={cond.conditionCode}
                        style={[styles.card, { paddingVertical: 14, paddingHorizontal: 14, backgroundColor: C.card, borderColor: C.borderHair }]}
                      >
                        <Text style={{ fontSize: 16, fontWeight: "800", color: C.textStrong, marginBottom: 8 }}>
                          {cond.conditionName}
                        </Text>
                        <View style={{ gap: 6 }}>
                          {cond.rows.map((r) => {
                            const statKey =
                              r.worstLevel === "red"
                                ? ("home.dashboard.dailyIntakeStatusRed" as const)
                                : r.worstLevel === "yellow"
                                  ? ("home.dashboard.dailyIntakeStatusYellow" as const)
                                  : r.worstLevel === "ok"
                                    ? ("home.dashboard.dailyIntakeStatusOk" as const)
                                    : ("home.dashboard.dailyIntakeUnknown" as const);
                            const curDisp =
                              r.current == null
                                ? t("home.dashboard.dailyIntakeUnknown")
                                : `${r.current.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 1 })} ${r.unit}`;
                            return (
                              <Text key={`${cond.conditionCode}-${r.slug}`} style={{ fontSize: 14, lineHeight: 20, color: C.textMuted }}>
                                {t("home.dashboard.dailyIntakeNutrientLine", {
                                  trigger: r.triggerName,
                                  current: curDisp,
                                  status: t(statKey),
                                })}
                              </Text>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                </View>
              )}
              {weeklyRuleCount > 0 ? (
                <Text style={{ marginTop: 10, fontSize: 12, color: C.textSubtle }}>
                  {t("home.dashboard.weeklyTrackNote", { count: weeklyRuleCount })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Risk */}
          <View style={[styles.card, { marginBottom: 14, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: C.card, borderColor: C.borderHair }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <Text style={[styles.sectionTitle, { flex: 1, marginRight: 12, color: C.textStrong }]}>{t("home.dashboard.riskCardTitle")}</Text>
              <Text style={{ fontWeight: "700", fontSize: 14, color: C.badgeSafeText }}>{t(riskLabelKey)}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: rgbTripletToRgba(palette["on-surface"], theme === "dark" ? 0.22 : 0.12), overflow: "hidden", marginBottom: 10 }}>
              <View style={{ height: "100%", width: `${risk.fill * 100}%`, backgroundColor: C.lime, borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.riskAxis, { color: C.textSubtle }]}>{t("home.dashboard.riskAxisLow")}</Text>
              <Text style={[styles.riskAxis, { color: C.textSubtle }]}>{t("home.dashboard.riskAxisMid")}</Text>
              <Text style={[styles.riskAxis, { color: C.textSubtle }]}>{t("home.dashboard.riskAxisHigh")}</Text>
            </View>
          </View>

          {/* Recent scans */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={[styles.sectionTitle, { color: C.textStrong }]}>{t("home.dashboard.recentTitleNew")}</Text>
              <Pressable onPress={() => router.push("/scan-history")} hitSlop={8}>
                <Text style={{ fontWeight: "600", fontSize: 14, color: C.onLime }}>{t("home.dashboard.recentSeeAllLink")}</Text>
              </Pressable>
            </View>
            {historyLoading ? (
              <ActivityIndicator color={C.onLime} style={{ paddingVertical: 16 }} />
            ) : recentItems.length === 0 ? (
              <Text style={{ fontSize: 15, lineHeight: 22, color: C.textMuted, paddingVertical: 8 }}>
                {t("home.dashboard.recentEmptyHint")}
              </Text>
            ) : (
              <View style={[styles.card, { paddingVertical: 0, overflow: "hidden", backgroundColor: C.card, borderColor: C.borderHair }]}>
                {recentItems.map((item, idx) => {
                  const badge =
                    item.safetyLabel === "safe"
                      ? { bg: C.badgeSafeBg, fg: C.badgeSafeText, key: "home.dashboard.badgeSafe" as const }
                      : item.safetyLabel === "caution"
                        ? { bg: C.badgeCautionBg, fg: C.badgeCautionText, key: "home.dashboard.badgeCaution" as const }
                        : { bg: C.badgeAvoidBg, fg: C.badgeAvoidText, key: "home.dashboard.badgeAvoid" as const };
                  const thumb = item.safetyLabel === "safe" ? "🟢" : item.safetyLabel === "caution" ? "🟡" : "🔴";
                  const dateStr = new Date(item.scannedAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/scan-history/${item.id}`)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                        borderTopColor: C.borderHair,
                      }}
                    >
                      <Text style={{ fontSize: 22, marginRight: 12 }}>{thumb}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: "600", fontSize: 15, color: C.textStrong }} numberOfLines={1}>
                          {item.productTitle || "—"}
                        </Text>
                        <Text style={{ fontSize: 12, color: C.textSubtle, marginTop: 2 }}>{dateStr}</Text>
                      </View>
                      <View style={{ borderRadius: R.pill, backgroundColor: badge.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: badge.fg }}>{t(badge.key)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaWrapper>
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
    fontSize: 20,
    fontWeight: "800",
  },
  ctaSub: {
    fontSize: 15,
    marginTop: 6,
    lineHeight: 22,
  },
  statBox: {
    borderRadius: R.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 116,
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 30,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  statTrend: {
    fontSize: 12,
    marginTop: 8,
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
