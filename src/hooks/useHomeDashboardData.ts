import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import {
  getScanHistory,
  fetchScanUsage,
  type ScanHistoryItem,
  type ScanUsageResponse,
} from "../services/labelScanService";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex, rgbTripletToRgba } from "../theme/designRgb";
import { dailyScanLimitForPlan, normalizeSubscriptionPlan } from "../constants/subscriptionPlans";
import { profileNeedsOnboarding } from "../utils/profileNeedsOnboarding";
import { getConditionLabel } from "../utils/conditionTypesDisplay";

// ── Pure helpers (no side-effects, easily unit-testable) ──────────────────────

export type DayTone = "empty" | "good" | "mid" | "bad";

export function dashboardGreetingSlot(hour: number) {
  if (hour >= 5 && hour < 12) return "Morning" as const;
  if (hour >= 12 && hour < 17) return "Afternoon" as const;
  if (hour >= 17 && hour < 22) return "Evening" as const;
  return "Night" as const;
}

export function isSameLocalCalendarDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function countTodayBySafety(items: ScanHistoryItem[], ref: Date) {
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

export function safeRatePercent(items: ScanHistoryItem[]): number | null {
  if (items.length === 0) return null;
  const safe = items.filter((i) => i.safetyLabel === "safe").length;
  return Math.round((safe / items.length) * 100);
}

export function riskFromToday(
  items: ScanHistoryItem[],
  ref: Date,
): { level: "low" | "medium" | "high"; fill: number } {
  const { today } = countTodayBySafety(items, ref);
  if (today.length === 0) return { level: "low", fill: 0.06 };

  let sum = 0;
  for (const s of today) {
    if (s.safetyLabel === "safe") sum += 0;
    else if (s.safetyLabel === "caution") sum += 0.5;
    else sum += 1;
  }
  const raw = sum / today.length;
  const fill = Math.min(1, Math.max(0.05, raw * 0.9 + 0.05));
  const level = raw < 0.22 ? "low" : raw < 0.55 ? "medium" : "high";
  return { level, fill };
}

export function parseHexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function lerpHex(from: string, to: string, t: number): string {
  const tt = Math.min(1, Math.max(0, t));
  const [a0, a1, a2] = parseHexRgb(from);
  const [b0, b1, b2] = parseHexRgb(to);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * tt);
  const r = mix(a0, b0);
  const g = mix(a1, b1);
  const b = mix(a2, b2);
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function iterLastSevenDays(ref: Date): Date[] {
  const res: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    res.push(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - i, 12, 0, 0, 0));
  }
  return res;
}

export function dayRiskTone(items: ScanHistoryItem[], day: Date): DayTone {
  const dayItems = items.filter((i) => isSameLocalCalendarDay(i.scannedAt, day));
  if (dayItems.length === 0) return "empty";
  if (dayItems.some((i) => i.safetyLabel === "avoid")) return "bad";
  if (dayItems.some((i) => i.safetyLabel === "caution")) return "mid";
  return "good";
}

// ── Color palette (shared by all home sub-components) ─────────────────────────

export type HomePalette = ReturnType<typeof buildHomePalette>;

export function buildHomePalette(
  palette: Record<string, string>,
  theme: "light" | "dark",
) {
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
    linkOnBackground: theme === "dark" ? "#FFFFFF" : onLime,
    spinnerOnBackground: theme === "dark" ? lime : onLime,
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useHomeDashboardData() {
  const { t, i18n } = useTranslation();

  const refreshProfile = useStore((s) => s.refreshProfile);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const authUser = useStore((s) => s.authUser);
  const userProfile = useStore((s) => s.userProfile);
  const theme = useStore((s) => s.theme);
  const medicalConditions = useStore((s) => s.medicalConditions);
  const medicalConditionsLoaded = useStore((s) => s.medicalConditionsLoaded);
  const loadMedicalConditions = useStore((s) => s.loadMedicalConditions);

  const palette = theme === "dark" ? DARK_RGB : LIGHT_RGB;
  const C = useMemo(() => buildHomePalette(palette, theme), [palette, theme]);

  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";
  const [greetingRefresh, setGreetingRefresh] = useState(0);
  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([]);
  const [scanUsage, setScanUsage] = useState<ScanUsageResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setGreetingRefresh((n) => n + 1);
      void refreshProfile();
    }, [refreshProfile]),
  );

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !medicalConditionsLoaded) void loadMedicalConditions();
    }, [isAuthenticated, medicalConditionsLoaded, loadMedicalConditions]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setHistoryItems([]);
        setScanUsage(null);
        setHistoryLoading(false);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          setHistoryLoading(true);
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
          const [histRes, usageRes] = await Promise.allSettled([
            getScanHistory(120),
            fetchScanUsage({ timezone: tz }),
          ]);
          if (!cancelled) {
            setHistoryItems(histRes.status === "fulfilled" ? histRes.value : []);
            setScanUsage(usageRes.status === "fulfilled" ? usageRes.value : null);
          }
        } catch {
          if (!cancelled) {
            setHistoryItems([]);
            setScanUsage(null);
          }
        } finally {
          if (!cancelled) setHistoryLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated]),
  );

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

  const profilePlanFallback = useMemo(
    () => normalizeSubscriptionPlan(userProfile?.subscriptionPlan),
    [userProfile?.subscriptionPlan],
  );

  const subtitleLine = useMemo(() => {
    if (todayStats.today.length === 0) return t("home.dashboard.summaryNoScansToday");
    return t("home.dashboard.summaryToday", {
      safe: todayStats.safe,
      caution: todayStats.caution,
      avoid: todayStats.avoid,
    });
  }, [todayStats, t]);

  const safeRate = useMemo(() => safeRatePercent(todayStats.today), [todayStats.today]);

  const safeRateYesterday = useMemo(() => {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const dayItems = historyItems.filter((i) => isSameLocalCalendarDay(i.scannedAt, y));
    return safeRatePercent(dayItems);
  }, [historyItems, now]);

  const safeRateFooterText = useMemo(() => {
    if (todayStats.today.length === 0) return t("home.dashboard.statsSafeRateEmpty");
    if (safeRate === null || safeRateYesterday === null) return null;
    const d = safeRate - safeRateYesterday;
    if (d > 0) return t("home.dashboard.statsSafeRateDeltaUp", { delta: d });
    if (d < 0) return t("home.dashboard.statsSafeRateDeltaDown", { delta: -d });
    return t("home.dashboard.statsSafeRateDeltaSame");
  }, [todayStats.today.length, safeRate, safeRateYesterday, t]);

  const usageFractionText = useMemo(() => {
    if (!isAuthenticated) return "—";
    const limit =
      scanUsage?.dailyLimit !== undefined ? scanUsage.dailyLimit : dailyScanLimitForPlan(profilePlanFallback);
    const used =
      scanUsage != null
        ? (() => {
            const n = Number(scanUsage.usedToday);
            return Number.isFinite(n) ? n : 0;
          })()
        : todayStats.today.length;
    if (limit == null) return `${used}/∞`;
    return `${used}/${limit}`;
  }, [isAuthenticated, scanUsage, profilePlanFallback, todayStats.today.length]);

  const usagePlanCaption = useMemo(() => {
    if (!isAuthenticated) return "";
    const planId = scanUsage?.plan ?? profilePlanFallback;
    const limit =
      scanUsage?.dailyLimit !== undefined ? scanUsage.dailyLimit : dailyScanLimitForPlan(profilePlanFallback);
    if (limit == null) return t("home.dashboard.statsDailyScansUnlimitedHint");
    return t("home.dashboard.statsDailyScansPlan", { plan: t(`payment.cards.${planId}.kicker`) });
  }, [isAuthenticated, scanUsage, profilePlanFallback, t]);

  const risk = useMemo(() => riskFromToday(historyItems, now), [historyItems, now]);

  const riskLabelKey = useMemo(
    () =>
      risk.level === "low"
        ? ("home.dashboard.riskLow" as const)
        : risk.level === "medium"
          ? ("home.dashboard.riskMedium" as const)
          : ("home.dashboard.riskHigh" as const),
    [risk.level],
  );

  const riskSpectrum = useMemo(() => {
    if (theme === "dark") return { low: "#4ade80", mid: "#fbbf24", high: "#f87171" };
    return { low: "#16a34a", mid: "#ca8a04", high: "#dc2626" };
  }, [theme]);

  const riskLabelColor = useMemo(
    () => lerpHex(riskSpectrum.low, riskSpectrum.high, risk.fill),
    [risk.fill, riskSpectrum],
  );

  const riskCardBorder = useMemo(() => {
    if (risk.level === "high")
      return theme === "dark" ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.35)";
    if (risk.level === "medium")
      return theme === "dark" ? "rgba(251,191,36,0.35)" : "rgba(202,138,4,0.35)";
    return C.borderHair;
  }, [C.borderHair, risk.level, theme]);

  const recentItems = useMemo(() => todayStats.today.slice(0, 3), [todayStats.today]);

  const needsProfile = useMemo(() => profileNeedsOnboarding(userProfile), [userProfile]);

  const topConcernTitle = useMemo(() => {
    const tday = todayStats.today;
    const avoid = tday.find((i) => i.safetyLabel === "avoid");
    if (avoid?.productTitle?.trim()) return avoid.productTitle.trim();
    const caution = tday.find((i) => i.safetyLabel === "caution");
    if (caution?.productTitle?.trim()) return caution.productTitle.trim();
    return null;
  }, [todayStats.today]);

  const riskBlurb = useMemo(() => {
    if (todayStats.today.length === 0) return t("home.dashboard.riskBlurbNoScans");
    const n = todayStats.today.length;
    if (risk.level === "high")
      return t("home.dashboard.riskBlurbHigh", { avoid: todayStats.avoid, caution: todayStats.caution });
    if (risk.level === "medium") return t("home.dashboard.riskBlurbMedium", { count: n });
    return t("home.dashboard.riskBlurbLow", { count: n });
  }, [todayStats.today.length, todayStats.avoid, todayStats.caution, risk.level, t]);

  const tipText = useMemo(() => {
    const codes = (userProfile?.conditionTypes ?? []).filter((c) => c !== "none");
    if (!codes.length || !medicalConditions.length) return t("home.dashboard.tipGeneric");
    const first = codes[0]!;
    const item = medicalConditions.find((c) => c.code === first);
    const label = getConditionLabel(first, lang, medicalConditions);
    if (item?.kind === "allergy") return t("home.dashboard.tipForAllergy", { condition: label });
    return t("home.dashboard.tipForDisease", { condition: label });
  }, [userProfile?.conditionTypes, medicalConditions, lang, t]);

  const weekStrip = useMemo(
    () =>
      iterLastSevenDays(now).map((d) => ({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        tone: dayRiskTone(historyItems, d),
        label: d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { weekday: "narrow" }),
      })),
    [historyItems, now, lang],
  );

  const hideGreetingSubtext = isAuthenticated && !historyLoading && todayStats.today.length > 0;

  return {
    // colors
    C,
    palette,
    theme,
    // routing helpers
    lang,
    // auth / profile
    isAuthenticated,
    needsProfile,
    // loading
    historyLoading,
    // derived text
    greetingLine,
    subtitleLine,
    hideGreetingSubtext,
    // stats
    todayStats,
    safeRate,
    safeRateFooterText,
    usageFractionText,
    usagePlanCaption,
    // risk
    risk,
    riskLabelKey,
    riskSpectrum,
    riskLabelColor,
    riskCardBorder,
    riskBlurb,
    // lists
    recentItems,
    // cards
    topConcernTitle,
    tipText,
    weekStrip,
  };
}
