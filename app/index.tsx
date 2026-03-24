import { View, Text, Pressable, ScrollView } from "react-native";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";

const DAILY_CALORIE_GOAL = 2000;
const consumedCalories = 0;
const remainingCalories = DAILY_CALORIE_GOAL - consumedCalories;

const macros = {
  protein: { current: 0, goal: 120, color: "#3b82f6" },
  carbs: { current: 0, goal: 200, color: "#f59e0b" },
  fat: { current: 0, goal: 65, color: "#a855f7" },
};

function CalorieCard({ c }: { c: ReturnType<typeof getThemeColors> }) {
  const { t } = useTranslation();
  return (
    <View style={{ backgroundColor: c.surface }} className="mx-4 my-4 rounded-2xl p-6 shadow-sm">
      <View className="items-center">
        <Text style={{ color: c.accent }} className="font-bold text-3xl">
          {consumedCalories.toLocaleString()}
        </Text>
        <Text style={{ color: c.textMuted }} className="text-sm font-medium mt-1">
          {t("home.kcalConsumed")}
        </Text>
        <View style={{ backgroundColor: c.border }} className="w-12 h-px my-3" />
        <Text style={{ color: c.textSecondary }} className="text-lg font-semibold">
          {remainingCalories.toLocaleString()}
        </Text>
        <Text style={{ color: c.textMuted }} className="text-xs">{t("home.remaining")}</Text>
      </View>
    </View>
  );
}

function MacroCard({
  label,
  icon,
  current,
  goal,
  color,
  c,
}: {
  label: string;
  icon: string;
  current: number;
  goal: number;
  color: string;
  c: ReturnType<typeof getThemeColors>;
}) {
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;

  return (
    <View style={{ backgroundColor: c.surface }} className="flex-1 rounded-xl p-3 shadow-sm mx-1 mb-3">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={{ color: c.textSecondary }} className="text-sm font-medium ml-1">{label}</Text>
      </View>
      <View style={{ backgroundColor: c.progressBg }} className="h-1.5 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${progress * 100}%`, backgroundColor: color }}
        />
      </View>
      <Text className="text-xs font-semibold mt-1">
        <Text style={{ color: c.text }}>{current}g</Text>
        <Text style={{ color: c.textMuted }}> / {goal}g</Text>
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const c = getThemeColors(theme);

  const formatDate = () => {
    const d = new Date();
    return d.toLocaleDateString(i18n.language === "tr" ? "tr-TR" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center justify-between px-4 py-3 border-b">
        <Pressable
          onPress={() => router.push("/profile")}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="person-outline" size={24} color={c.accent} />
        </Pressable>
        <View className="items-center">
          <Text style={{ color: c.textMuted }} className="text-sm">{t("common.today")}</Text>
          <Text style={{ color: c.text }} className="text-base font-bold">
            {formatDate()}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="settings-outline" size={24} color={c.accent} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <CalorieCard c={c} />

        <View className="px-4">
          <Text style={{ color: c.text }} className="text-base font-bold mb-3">{t("home.macronutrients")}</Text>
          <View className="flex-row">
            <MacroCard
              label={t("home.protein")}
              icon="egg-outline"
              current={macros.protein.current}
              goal={macros.protein.goal}
              color={macros.protein.color}
              c={c}
            />
            <MacroCard
              label={t("home.carbs")}
              icon="nutrition-outline"
              current={macros.carbs.current}
              goal={macros.carbs.goal}
              color={macros.carbs.color}
              c={c}
            />
            <MacroCard
              label={t("home.fat")}
              icon="water-outline"
              current={macros.fat.current}
              goal={macros.fat.goal}
              color={macros.fat.color}
              c={c}
            />
          </View>
        </View>

        <View className="px-4 mt-4">
          <Text style={{ color: c.text }} className="text-base font-bold mb-3">{t("home.todaysMeals")}</Text>
          <Pressable
            onPress={() => router.push("/history")}
            style={{ backgroundColor: c.surface }}
            className="rounded-xl p-4 flex-row items-center mb-3 shadow-sm active:opacity-90"
          >
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: c.accentMuted }}
            >
              <Ionicons name="restaurant-outline" size={24} color={c.accent} />
            </View>
            <View className="flex-1">
              <Text style={{ color: c.text }} className="font-semibold">{t("home.todaysMeals")}</Text>
              <Text style={{ color: c.textMuted }} className="text-sm">
                {t("common.viewAll")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
          </Pressable>
        </View>

        <View className="px-4 mt-2">
          <Text style={{ color: c.text }} className="text-base font-bold mb-3">{t("home.quickActions")}</Text>
          <Pressable
            onPress={() => router.push("/scan")}
            style={{ backgroundColor: c.surface }}
            className="rounded-xl p-4 flex-row items-center mb-3 shadow-sm active:opacity-90"
          >
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: c.accentMuted }}
            >
              <Ionicons name="camera" size={24} color={c.accent} />
            </View>
            <View className="flex-1">
              <Text style={{ color: c.text }} className="font-semibold">{t("home.scanOrInput")}</Text>
              <Text style={{ color: c.textMuted }} className="text-sm">
                {t("home.addMealByScanning")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/history")}
            style={{ backgroundColor: c.surface }}
            className="rounded-xl p-4 flex-row items-center shadow-sm active:opacity-90"
          >
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: c.accentMuted }}
            >
              <Ionicons name="time" size={24} color={c.accent} />
            </View>
            <View className="flex-1">
              <Text style={{ color: c.text }} className="font-semibold">{t("home.eatingHistory")}</Text>
              <Text style={{ color: c.textMuted }} className="text-sm">
                {t("home.viewAllLoggedMeals")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
