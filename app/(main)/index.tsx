import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import AmbientCircles from "../../components/AmbientCircles";
import { useStore } from "../../store/useStore";
import { getTodayMeals } from "../../services/mealsService";
import { buildNutritionDashboard } from "../../utils/nutritionDashboard";

function formatKcal(n: number) {
  return n.toLocaleString();
}

/** Yerel saate göre karşılama metni (5–12 sabah, 12–17 öğleden sonra, 17–22 akşam, 22–5 gece). */
function dashboardGreetingI18nKey(hour: number) {
  if (hour >= 5 && hour < 12) return "home.dashboard.greetingMorning" as const;
  if (hour >= 12 && hour < 17) return "home.dashboard.greetingAfternoon" as const;
  if (hour >= 17 && hour < 22) return "home.dashboard.greetingEvening" as const;
  return "home.dashboard.greetingNight" as const;
}

function CalorieRing({
  size,
  progress,
  kcalText,
  label,
}: {
  size: number;
  progress: number;
  kcalText: string;
  label: string;
}) {
  const stroke = Math.max(10, Math.round((size * 22) / 320));
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - progress);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute" }}
      >
        <Defs>
          <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4e6300" />
            <Stop offset="100%" stopColor="#cafd00" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#e7e8e8"
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${c}`}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View className="items-center px-2">
        <Text
          className="text-on-surface text-center font-headline"
          style={{
            fontSize: size > 200 ? 34 : size > 160 ? 28 : 24,
            lineHeight: size > 200 ? 38 : size > 160 ? 32 : 28,
          }}
        >
          {kcalText}
        </Text>
        <Text className="text-outline font-label text-xs uppercase tracking-widest mt-2 text-center font-bold">
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const theme = useStore((s) => s.theme);
  const userProfile = useStore((s) => s.userProfile);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const [greetingRefresh, setGreetingRefresh] = useState(0);
  const [todayTotals, setTodayTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  useFocusEffect(
    useCallback(() => {
      setGreetingRefresh((n) => n + 1);
      let cancelled = false;
      (async () => {
        try {
          await refreshProfile();
          const data = await getTodayMeals();
          if (!cancelled) setTodayTotals(data.totals);
        } catch {
          if (!cancelled) {
            setTodayTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshProfile]),
  );

  const dash = useMemo(
    () => buildNutritionDashboard(userProfile, todayTotals),
    [userProfile, todayTotals],
  );

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const baseRing = width >= 400 ? 320 : Math.min(280, width - 48);
  /** Tek ekranda sığsın diye halka boyutu (üst bar + içerik tahmini). */
  const estHeaderPx = 84;
  const usableH = windowHeight - insets.top - insets.bottom - estHeaderPx;
  const ringCapByHeight = Math.max(88, Math.min(158, Math.floor(usableH * 0.22)));
  const ringSize = Math.round(Math.min(baseRing * 0.5, ringCapByHeight));
  const bottomPad = 16 + Math.max(insets.bottom, 12);

  const greetingLine = useMemo(
    () => t(dashboardGreetingI18nKey(new Date().getHours())),
    [greetingRefresh, t],
  );

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="home" />

          <View
            className="flex-1 min-h-0 px-6 pt-3"
            style={{
              paddingBottom: bottomPad,
              maxWidth: 896,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <View className="flex-1 min-h-0 justify-between">
              <View className="min-h-0 shrink">
            {/* Hero */}
            <View
              className={`mb-4 ${width >= 900 ? "flex-row items-center gap-6" : "gap-4"}`}
            >
              <View className={`${width >= 900 ? "flex-1 max-w-md" : ""} gap-2`}>
                <Text className="text-on-surface font-headline text-4xl leading-tight tracking-tighter">
                  {greetingLine}
                </Text>
                <Text className="text-on-surface-variant font-body text-lg leading-relaxed max-w-md">
                  {t("home.dashboard.heroSubtext", {
                    percent: Math.round(dash.kcalProgress * 100),
                  })}
                </Text>
              </View>
              <View
                className={`items-center ${width >= 900 ? "flex-1 items-end" : "justify-center"}`}
              >
                <CalorieRing
                  size={ringSize}
                  progress={dash.kcalProgress}
                  kcalText={formatKcal(dash.kcalConsumed)}
                  label={t("home.dashboard.kcalConsumed")}
                />
              </View>
            </View>

            {/* Macros: protein → yağ → karbo, alt alta */}
            <View className="flex-col gap-3">
              <View className="w-full bg-surface-container-lowest rounded-[1rem] px-4 py-4 shadow-ambient min-w-0">
                <View className="flex-row justify-between items-center mb-2.5">
                  <View className="flex-1 min-w-0 pr-1">
                    <Text className="text-outline font-label text-[10px] uppercase tracking-widest font-bold">
                      {t("home.dashboard.macroProtein")}
                    </Text>
                    <Text
                      className="text-on-surface font-headline font-bold mt-0.5"
                      style={{ fontSize: width < 360 ? 18 : 22 }}
                      numberOfLines={1}
                    >
                      {dash.protein}g
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="arm-flex" size={26} color="#beee00" />
                </View>
                <View className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.round(dash.proteinBarPct * 100)}%` }}
                  />
                </View>
                <Text
                  className="text-on-surface-variant font-body font-semibold mt-2"
                  style={{ fontSize: width < 360 ? 10 : 11 }}
                  numberOfLines={2}
                >
                  {t("home.dashboard.remainingGrams", { n: dash.proteinRemain })}
                </Text>
              </View>

              <View className="w-full bg-surface-container-lowest rounded-[1rem] px-4 py-4 shadow-ambient min-w-0">
                <View className="flex-row justify-between items-center mb-2.5">
                  <View className="flex-1 min-w-0 pr-1">
                    <Text className="text-outline font-label text-[10px] uppercase tracking-widest font-bold">
                      {t("home.dashboard.macroFats")}
                    </Text>
                    <Text
                      className="text-on-surface font-headline font-bold mt-0.5"
                      style={{ fontSize: width < 360 ? 18 : 22 }}
                      numberOfLines={1}
                    >
                      {dash.fats}g
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="water" size={26} color="#f5a623" />
                </View>
                <View className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <View
                    className="h-full bg-tertiary-container rounded-full"
                    style={{ width: `${Math.round(dash.fatBarPct * 100)}%` }}
                  />
                </View>
                <Text
                  className="text-on-surface-variant font-body font-semibold mt-2"
                  style={{ fontSize: width < 360 ? 10 : 11 }}
                  numberOfLines={2}
                >
                  {t("home.dashboard.remainingGrams", { n: dash.fatRemain })}
                </Text>
              </View>

              <View className="w-full bg-surface-container-lowest rounded-[1rem] px-4 py-4 shadow-ambient min-w-0">
                <View className="flex-row justify-between items-center mb-2.5">
                  <View className="flex-1 min-w-0 pr-1">
                    <Text className="text-outline font-label text-[10px] uppercase tracking-widest font-bold">
                      {t("home.dashboard.macroCarbs")}
                    </Text>
                    <Text
                      className="text-on-surface font-headline font-bold mt-0.5"
                      style={{ fontSize: width < 360 ? 18 : 22 }}
                      numberOfLines={1}
                    >
                      {dash.carbs}g
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="fire" size={26} color="#e53935" />
                </View>
                <View className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <View
                    className="h-full bg-secondary-container rounded-full"
                    style={{ width: `${Math.round(dash.carbBarPct * 100)}%` }}
                  />
                </View>
                <Text
                  className="text-on-surface-variant font-body font-semibold mt-2"
                  style={{ fontSize: width < 360 ? 10 : 11 }}
                  numberOfLines={2}
                >
                  {t("home.dashboard.remainingGrams", { n: dash.carbRemain })}
                </Text>
              </View>
            </View>
              </View>

            {/* Quick actions: sayfa genişliğinde yan yana iki geniş buton */}
            <View className="w-full shrink-0 flex-row gap-2 pt-2">
              <Pressable
                onPress={() => router.push("/meal-description")}
                className="relative min-w-0 flex-1 overflow-hidden rounded-xl bg-primary-fixed py-8 px-2 active:opacity-90"
              >
                <AmbientCircles preset="cta" instanceId={0} />
                <View className="z-10 flex-row items-center justify-center gap-2.5">
                  <MaterialCommunityIcons name="silverware-fork-knife" size={26} color="#3a4a00" />
                  <Text
                    className="shrink text-center text-on-primary-fixed font-headline font-bold text-sm"
                    style={{ fontFamily: "Manrope_700Bold" }}
                    numberOfLines={2}
                  >
                    {t("home.dashboard.ctaAddMeal")}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => router.push("/scan")}
                className="relative min-w-0 flex-1 overflow-hidden rounded-xl bg-primary-fixed py-8 px-2 active:opacity-90"
              >
                <AmbientCircles preset="cta" instanceId={1} />
                <View className="z-10 flex-row items-center justify-center gap-2.5">
                  <MaterialCommunityIcons name="barcode-scan" size={26} color="#3a4a00" />
                  <Text
                    className="shrink text-center text-on-primary-fixed font-headline font-bold text-sm"
                    style={{ fontFamily: "Manrope_700Bold" }}
                    numberOfLines={2}
                  >
                    {t("home.dashboard.ctaScanMeal")}
                  </Text>
                </View>
              </Pressable>
            </View>
            </View>
          </View>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
