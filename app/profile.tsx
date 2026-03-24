import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";
import { api } from "../services/api";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const authUser = useStore((s) => s.authUser);
  const c = getThemeColors(theme);
  const heightCm = useStore((s) => s.heightCm);
  const weightKg = useStore((s) => s.weightKg);
  const conditionTypes = useStore((s) => s.conditionTypes);
  const dietaryPreferences = useStore((s) => s.dietaryPreferences);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<UserProfile>("/users/me")
      .then(setProfile)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const displayName = profile?.name || authUser?.name || "—";

  return (
    <SafeAreaWrapper style={{ backgroundColor: c.background }} className="flex-1" edges={["top"]}>
      <View style={{ borderBottomColor: c.border, backgroundColor: c.surface }} className="flex-row items-center px-4 py-3 border-b">
        <Pressable
          onPress={() => router.back()}
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
        scrollEnabled={false}
      >
        <View className="p-4 pb-8">
          {/* User card */}
          <View style={{ backgroundColor: c.surface }} className="rounded-xl p-6 mb-6 items-center">
            <View style={{ backgroundColor: c.accentMuted }} className="w-20 h-20 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">👤</Text>
            </View>
            {loading ? (
              <ActivityIndicator color={c.accent} style={{ marginVertical: 8 }} />
            ) : (
              <>
                <Text style={{ color: c.text }} className="text-xl font-bold text-center">
                  {displayName}
                </Text>
              </>
            )}
          </View>

          {/* Menu items */}
          <View>
            <Pressable
              onPress={() => router.push("/personal-info")}
              style={{ backgroundColor: c.surface }}
              className="flex-row items-center rounded-xl p-4 mb-3"
            >
              <View className="mr-3">
                <Ionicons name="person-outline" size={24} color={c.iconMuted} />
              </View>
              <View className="flex-1 min-w-0">
                <Text style={{ color: c.text }} className="font-medium">
                  {t("profile.personalInfo")}
                </Text>
                <Text style={{ color: c.textMuted }} className="text-xs mt-0.5" numberOfLines={1}>
                  {`${heightCm || "—"} cm • ${weightKg || "—"} kg • ${conditionTypes
                    .map((type) => t(`profile.conditionsList.${type}`))
                    .join(", ")}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/diet-preferences")}
              style={{ backgroundColor: c.surface }}
              className="flex-row items-center rounded-xl p-4 mb-3"
            >
              <View className="mr-3">
                <Ionicons name="nutrition-outline" size={24} color={c.iconMuted} />
              </View>
              <View className="flex-1 min-w-0">
                <Text style={{ color: c.text }} className="font-medium">
                  {t("profile.dietaryPreferences")}
                </Text>
                <Text style={{ color: c.textMuted }} className="text-xs mt-0.5" numberOfLines={1}>
                  {dietaryPreferences.length > 0
                    ? dietaryPreferences.map((key) => t(`profile.dietList.${key}`)).join(", ")
                    : t("profile.noSelection")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.iconSecondary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
