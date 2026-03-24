import { View, Text, ScrollView, Pressable, Alert } from "react-native";
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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex } from "../../theme/designRgb";

function FeatureRow({
  label,
  emphasized,
  accentColor,
}: {
  label: string;
  emphasized?: boolean;
  accentColor: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <MaterialCommunityIcons name="check-circle" size={18} color={accentColor} />
      <Text
        className={`flex-1 text-[15px] leading-snug ${emphasized ? "text-on-surface font-medium" : "text-on-surface-variant"}`}
        style={{ fontFamily: emphasized ? "Inter_500Medium" : "Inter_400Regular" }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const palette = theme === "dark" ? DARK_RGB : LIGHT_RGB;
  const primaryHex = rgbTripletToHex(palette.primary);
  const outlineMuted = rgbTripletToHex(palette["outline-variant"]);
  const onSurfaceHex = rgbTripletToHex(palette["on-surface"]);
  const limeGlow = rgbTripletToHex(palette["primary-fixed"]);

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const comingSoon = () => Alert.alert(t("auth.comingSoon"));
  const bottomPad = 32 + Math.max(insets.bottom, 12);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader
            variant="inner"
            title={t("subscription.title")}
            onBack={() =>
              router.canGoBack() ? router.back() : router.replace("/settings")
            }
          />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: bottomPad,
              maxWidth: 400,
              width: "100%",
              alignSelf: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-8">
              <Text
                className="text-2xl tracking-tight text-on-surface"
                style={{ fontFamily: "Manrope_800ExtraBold", lineHeight: 32 }}
              >
                {t("subscription.headline")}
              </Text>
            </View>

            <View className="gap-4">
              {/* Free */}
              <View
                className={`overflow-hidden rounded-card bg-surface-container-low p-5 ${
                  theme === "dark" ? "shadow-ambient-glow" : "shadow-ambient"
                }`}
              >
                <View className="mb-6 flex-row items-start justify-between">
                  <View className="gap-1">
                    <Text
                      className="text-xs uppercase tracking-widest text-outline"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("subscription.freeTier")}
                    </Text>
                    <Text
                      className="text-2xl text-on-surface"
                      style={{ fontFamily: "Manrope_700Bold" }}
                    >
                      {t("subscription.freeTitle")}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="card-account-details-outline" size={28} color={outlineMuted} />
                </View>
                <View className="mb-8 gap-3">
                  <FeatureRow label={t("subscription.freeFeature1")} accentColor={primaryHex} />
                  <FeatureRow label={t("subscription.freeFeature2")} accentColor={primaryHex} />
                  <FeatureRow label={t("subscription.freeFeature3")} accentColor={primaryHex} />
                </View>
                <View className="flex-row items-end justify-between">
                  <View className="rounded-full border border-outline-variant/20 px-6 py-2.5">
                    <Text
                      className="text-sm font-semibold text-primary"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("subscription.currentPlan")}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-[10px] uppercase tracking-tighter text-outline"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("subscription.costLabel")}
                    </Text>
                    <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_700Bold" }}>
                      {t("subscription.freePrice")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Plus — recommended */}
              <View className="relative mt-2">
                <View
                  className="absolute z-10 rounded-full bg-primary-container px-4 py-1.5 shadow-sm"
                  style={{
                    top: -12,
                    right: 16,
                  }}
                >
                  <Text
                    className="text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t("subscription.recommended")}
                  </Text>
                </View>
                <View
                  className={`overflow-hidden rounded-card border-2 border-primary-container bg-primary-container/10 p-5 ${
                    theme === "dark" ? "shadow-ambient-glow" : "shadow-ambient"
                  }`}
                >
                  <View className="mb-6 flex-row items-start justify-between">
                    <View className="gap-1">
                      <Text
                        className="text-xs font-semibold uppercase tracking-widest text-primary"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("subscription.plusTier")}
                      </Text>
                      <Text
                        className="text-2xl text-on-surface"
                        style={{ fontFamily: "Manrope_700Bold" }}
                      >
                        {t("subscription.plusTitle")}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chart-timeline-variant" size={28} color={primaryHex} />
                  </View>
                  <View className="mb-8 gap-3">
                    <FeatureRow label={t("subscription.plusFeature1")} emphasized accentColor={primaryHex} />
                    <FeatureRow label={t("subscription.plusFeature2")} emphasized accentColor={primaryHex} />
                    <FeatureRow label={t("subscription.plusFeature3")} emphasized accentColor={primaryHex} />
                  </View>
                  <View className="flex-row items-end justify-between">
                    <Pressable
                      onPress={comingSoon}
                      className="rounded-full bg-primary-fixed px-8 py-3 active:opacity-90"
                      style={{
                        shadowColor: limeGlow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 10,
                        elevation: 4,
                      }}
                    >
                      <Text
                        className="text-sm font-bold text-on-primary-fixed"
                        style={{ fontFamily: "Manrope_700Bold" }}
                      >
                        {t("subscription.upgradeNow")}
                      </Text>
                    </Pressable>
                    <View className="items-end">
                      <Text
                        className="text-[10px] uppercase tracking-tighter text-primary"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("subscription.monthlyLabel")}
                      </Text>
                      <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_700Bold" }}>
                        {t("subscription.plusPrice")}
                        <Text
                          className="text-sm font-normal text-on-surface-variant"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {t("subscription.perMonth")}
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Pro */}
              <View
                className={`overflow-hidden rounded-card bg-surface-container-low p-5 ${
                  theme === "dark" ? "shadow-ambient-glow" : "shadow-ambient"
                }`}
              >
                <View className="mb-6 flex-row items-start justify-between">
                  <View className="gap-1">
                    <Text
                      className="text-xs uppercase tracking-widest text-outline"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("subscription.proTier")}
                    </Text>
                    <Text
                      className="text-2xl text-on-surface"
                      style={{ fontFamily: "Manrope_700Bold" }}
                    >
                      {t("subscription.proTitle")}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={onSurfaceHex} />
                </View>
                <View className="mb-8 gap-3">
                  <FeatureRow label={t("subscription.proFeature1")} accentColor={primaryHex} />
                  <FeatureRow label={t("subscription.proFeature2")} accentColor={primaryHex} />
                  <FeatureRow label={t("subscription.proFeature3")} accentColor={primaryHex} />
                </View>
                <View className="flex-row items-end justify-between">
                  <Pressable
                    onPress={comingSoon}
                    className="rounded-full border-2 border-on-surface px-8 py-3 active:opacity-90"
                  >
                    <Text
                      className="text-sm font-bold text-on-surface"
                      style={{ fontFamily: "Manrope_700Bold" }}
                    >
                      {t("subscription.selectPlan")}
                    </Text>
                  </Pressable>
                  <View className="items-end">
                    <Text
                      className="text-[10px] uppercase tracking-tighter text-outline"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("subscription.monthlyLabel")}
                    </Text>
                    <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_700Bold" }}>
                      {t("subscription.proPrice")}
                      <Text
                        className="text-sm font-normal text-on-surface-variant"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {t("subscription.perMonth")}
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text
              className="mt-8 px-2 text-center text-xs leading-relaxed text-outline"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("subscription.footerLegal")}
            </Text>
          </ScrollView>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
