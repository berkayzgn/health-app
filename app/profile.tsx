import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const c = getThemeColors(theme);

  return (
    <SafeAreaView style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center px-4 py-3 border-b">
        <Pressable
          onPress={() => router.replace("/")}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color={c.accent} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: c.text }} className="text-lg font-bold">{t("profile.title")}</Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 pb-8">
          <View style={{ backgroundColor: c.surface }} className="rounded-xl p-6 mb-6 items-center">
            <View style={{ backgroundColor: c.accentMuted }} className="w-20 h-20 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">👤</Text>
            </View>
            <Text style={{ color: c.text }} className="text-xl font-bold text-center">
              {t("profile.title")}
            </Text>
            <Text style={{ color: c.textMuted }} className="mt-1 text-center">
              {t("profile.subtitle")}
            </Text>
          </View>

          <View>
            <Pressable style={{ backgroundColor: c.surface }} className="flex-row items-center rounded-xl p-4 mb-3">
              <View className="mr-3">
                <Ionicons name="person-outline" size={24} color={c.iconMuted} />
              </View>
              <Text style={{ color: c.text }} className="flex-1 font-medium min-w-0">
                {t("profile.personalInfo")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
            </Pressable>
            <Pressable style={{ backgroundColor: c.surface }} className="flex-row items-center rounded-xl p-4 mb-3">
              <View className="mr-3">
                <Ionicons name="nutrition-outline" size={24} color={c.iconMuted} />
              </View>
              <Text style={{ color: c.text }} className="flex-1 font-medium min-w-0">
                {t("profile.dietaryPreferences")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
            </Pressable>
            <Pressable style={{ backgroundColor: c.surface }} className="flex-row items-center rounded-xl p-4 mb-3">
              <View className="mr-3">
                <Ionicons name="fitness-outline" size={24} color={c.iconMuted} />
              </View>
              <Text style={{ color: c.text }} className="flex-1 font-medium min-w-0">
                {t("profile.healthGoals")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
