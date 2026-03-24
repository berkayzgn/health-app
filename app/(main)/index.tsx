import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
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
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatKcal(n: number) {
  return n.toLocaleString();
}

function generateMockDashboard() {
  const kcalGoal = randInt(2000, 2600);
  const kcalConsumed = randInt(Math.floor(kcalGoal * 0.45), Math.floor(kcalGoal * 0.82));
  const kcalProgress = kcalConsumed / kcalGoal;

  const proteinTarget = randInt(110, 140);
  const protein = randInt(Math.floor(proteinTarget * 0.55), Math.floor(proteinTarget * 0.92));
  const proteinRemain = Math.max(0, proteinTarget - protein);

  const carbTarget = randInt(220, 300);
  const carbs = randInt(Math.floor(carbTarget * 0.4), Math.floor(carbTarget * 0.85));
  const carbRemain = Math.max(0, carbTarget - carbs);

  const fatTarget = randInt(55, 75);
  const fats = randInt(Math.floor(fatTarget * 0.45), Math.floor(fatTarget * 0.88));
  const fatRemain = Math.max(0, fatTarget - fats);

  return {
    kcalConsumed,
    kcalProgress: Math.min(0.98, Math.max(0.35, kcalProgress)),
    protein,
    proteinPct: protein / proteinTarget,
    proteinRemain,
    carbs,
    carbPct: carbs / carbTarget,
    carbRemain,
    fats,
    fatPct: fats / fatTarget,
    fatRemain,
  };
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
  const stroke = 22;
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
          style={{ fontSize: size > 300 ? 52 : 42, lineHeight: size > 300 ? 56 : 46 }}
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useStore((s) => s.theme);
  const mock = useMemo(() => generateMockDashboard(), []);

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const ringSize = width >= 400 ? 320 : Math.min(280, width - 48);
  const bottomPad = 24 + Math.max(insets.bottom, 12);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="home" />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: bottomPad,
              maxWidth: 896,
              width: "100%",
              alignSelf: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View
              className={`mb-10 ${width >= 900 ? "flex-row items-center gap-12" : "gap-8"}`}
            >
              <View className={`${width >= 900 ? "flex-1 max-w-md" : ""} gap-4`}>
                <Text className="text-on-surface font-headline text-4xl leading-tight tracking-tighter">
                  {t("home.dashboard.greetingLine1")}
                </Text>
                <Text className="text-on-surface-variant font-body text-lg leading-relaxed max-w-md">
                  {t("home.dashboard.heroSubtext", {
                    percent: Math.round(mock.kcalProgress * 100),
                  })}
                </Text>
              </View>
              <View
                className={`items-center ${width >= 900 ? "flex-1 items-end" : "justify-center"}`}
              >
                <CalorieRing
                  size={ringSize}
                  progress={mock.kcalProgress}
                  kcalText={formatKcal(mock.kcalConsumed)}
                  label={t("home.dashboard.kcalConsumed")}
                />
              </View>
            </View>

            {/* Macros: protein → yağ → karbo, always row */}
            <View className="flex-row gap-2 mb-10">
              <View className="flex-1 bg-surface-container-lowest rounded-[1rem] p-4 shadow-ambient min-w-0">
                <View className="flex-row justify-between items-start mb-6">
                  <View className="flex-1 min-w-0 pr-1">
                    <Text className="text-outline font-label text-[10px] uppercase tracking-widest font-bold">
                      {t("home.dashboard.macroProtein")}
                    </Text>
                    <Text
                      className="text-on-surface font-headline font-bold mt-1"
                      style={{ fontSize: width < 360 ? 20 : 26 }}
                      numberOfLines={1}
                    >
                      {mock.protein}g
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="egg" size={22} color="#beee00" />
                </View>
                <View className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.round(mock.proteinPct * 100)}%` }}
                  />
                </View>
                <Text
                  className="text-on-surface-variant font-body font-semibold mt-3"
                  style={{ fontSize: width < 360 ? 10 : 11 }}
                  numberOfLines={2}
                >
                  {t("home.dashboard.remainingGrams", { n: mock.proteinRemain })}
                </Text>
              </View>

              <View className="flex-1 bg-surface-container-lowest rounded-[1rem] p-4 shadow-ambient min-w-0">
                <View className="flex-row justify-between items-start mb-6">
                  <View className="flex-1 min-w-0 pr-1">
                    <Text className="text-outline font-label text-[10px] uppercase tracking-widest font-bold">
                      {t("home.dashboard.macroFats")}
                    </Text>
                    <Text
                      className="text-on-surface font-headline font-bold mt-1"
                      style={{ fontSize: width < 360 ? 20 : 26 }}
                      numberOfLines={1}
                    >
                      {mock.fats}g
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="oil" size={22} color="#6a5b00" />
                </View>
                <View className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <View
                    className="h-full bg-tertiary-container rounded-full"
                    style={{ width: `${Math.round(mock.fatPct * 100)}%` }}
                  />
                </View>
                <Text
                  className="text-on-surface-variant font-body font-semibold mt-3"
                  style={{ fontSize: width < 360 ? 10 : 11 }}
                  numberOfLines={2}
                >
                  {t("home.dashboard.remainingGrams", { n: mock.fatRemain })}
                </Text>
              </View>

              <View className="flex-1 bg-surface-container-lowest rounded-[1rem] p-4 shadow-ambient min-w-0">
                <View className="flex-row justify-between items-start mb-6">
                  <View className="flex-1 min-w-0 pr-1">
                    <Text className="text-outline font-label text-[10px] uppercase tracking-widest font-bold">
                      {t("home.dashboard.macroCarbs")}
                    </Text>
                    <Text
                      className="text-on-surface font-headline font-bold mt-1"
                      style={{ fontSize: width < 360 ? 20 : 26 }}
                      numberOfLines={1}
                    >
                      {mock.carbs}g
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="bread-slice" size={22} color="#605e00" />
                </View>
                <View className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <View
                    className="h-full bg-secondary-container rounded-full"
                    style={{ width: `${Math.round(mock.carbPct * 100)}%` }}
                  />
                </View>
                <Text
                  className="text-on-surface-variant font-body font-semibold mt-3"
                  style={{ fontSize: width < 360 ? 10 : 11 }}
                  numberOfLines={2}
                >
                  {t("home.dashboard.remainingGrams", { n: mock.carbRemain })}
                </Text>
              </View>
            </View>

            {/* AI recommendation */}
            <View className="bg-primary-fixed rounded-[1rem] p-10 overflow-hidden relative min-h-[300px] justify-between">
              <View className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-on-primary-fixed/10" />
              <View className="z-10 flex-1 justify-between gap-8">
                <View>
                  <View className="bg-on-primary-fixed px-3 py-1 rounded-full self-start mb-4">
                    <Text className="text-primary-fixed text-[10px] font-label font-bold uppercase tracking-widest">
                      {t("home.dashboard.aiBadge")}
                    </Text>
                  </View>
                  <Text className="text-on-primary-fixed font-headline text-2xl leading-tight tracking-tight mt-2">
                    {t("home.dashboard.aiTitle")}
                  </Text>
                  <Text className="text-on-primary-fixed/80 font-body leading-relaxed mt-4 max-w-sm">
                    {t("home.dashboard.aiBody")}
                  </Text>
                </View>
                <Pressable className="bg-on-primary-fixed rounded-full px-8 py-4 self-start active:opacity-90">
                  <Text className="text-primary-fixed font-headline font-bold text-sm">
                    {t("home.dashboard.aiCta")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
