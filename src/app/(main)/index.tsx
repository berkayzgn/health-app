import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useFonts } from "expo-font";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import AmbientCircles from "../../components/AmbientCircles";
import { useStore } from "../../store/useStore";

function dashboardGreetingI18nKey(hour: number) {
  if (hour >= 5 && hour < 12) return "home.dashboard.greetingMorning" as const;
  if (hour >= 12 && hour < 17) return "home.dashboard.greetingAfternoon" as const;
  if (hour >= 17 && hour < 22) return "home.dashboard.greetingEvening" as const;
  return "home.dashboard.greetingNight" as const;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const [greetingRefresh, setGreetingRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setGreetingRefresh((n) => n + 1);
      void refreshProfile();
    }, [refreshProfile]),
  );

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
  });

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

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: bottomPad,
              maxWidth: 896,
              width: "100%",
              alignSelf: "center",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              className="text-on-surface font-headline text-4xl leading-tight tracking-tighter mb-2"
              style={{ fontFamily: "Manrope_800ExtraBold" }}
            >
              {greetingLine}
            </Text>
            <Text
              className="text-on-surface-variant font-body text-lg leading-relaxed max-w-xl mb-8"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("home.dashboard.heroSubtext")}
            </Text>

            <Pressable
              onPress={() => router.push("/scan")}
              className="relative mb-4 overflow-hidden rounded-xl bg-primary-fixed py-10 px-4 active:opacity-90"
            >
              <AmbientCircles preset="cta" instanceId={0} />
              <View className="z-10 flex-row items-center justify-center gap-3">
                <MaterialCommunityIcons name="camera-outline" size={32} color="#3a4a00" />
                <Text
                  className="shrink text-center text-on-primary-fixed font-headline font-bold text-lg"
                  style={{ fontFamily: "Manrope_700Bold" }}
                >
                  {t("home.dashboard.ctaScanFood")}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push("/scan-history")}
              className="relative overflow-hidden rounded-xl border-2 border-primary-fixed/40 bg-surface-container-lowest py-6 px-4 active:opacity-90"
            >
              <View className="z-10 flex-row items-center justify-center gap-3">
                <MaterialCommunityIcons name="history" size={28} color="#4e6300" />
                <View className="flex-1 min-w-0">
                  <Text
                    className="text-on-surface font-headline font-bold text-base"
                    style={{ fontFamily: "Manrope_700Bold" }}
                  >
                    {t("home.dashboard.ctaScanHistory")}
                  </Text>
                  <Text
                    className="text-on-surface-variant text-sm mt-1"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {t("home.dashboard.ctaScanHistorySubtitle")}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#767777" />
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
