import { useMemo, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 px-5 py-4 mb-4">
      <Text
        className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline mb-2"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Demo: ile giriş yapan kullanıcı için sabit yenileme ve kart maskesi — gerçek ödeme entegrasyonu sonrası API’den gelecek. */
export default function PaymentOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const locale = i18n.language?.startsWith("tr") ? "tr-TR" : "en-US";

  const nextRenewalFormatted = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 30);
    return next.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [locale]);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-background" />;
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-background" edges={["top", "bottom"]}>
        <AppHeader variant="inner" title={t("payment.billing.headerTitle")} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 16,
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 24),
            maxWidth: 720,
            width: "100%",
            alignSelf: "center",
            flexGrow: 0,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text
            className="text-on-surface-variant text-base leading-relaxed mb-6"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("payment.billing.intro")}
          </Text>

          <DetailBlock label={t("payment.billing.currentPlanLabel")}>
            <Text className="text-xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
              {t("payment.billing.activePlanName")}
            </Text>
            <Text
              className="text-sm text-on-surface-variant mt-2"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("payment.billing.activePlanPriceHint")}
            </Text>
          </DetailBlock>

          <DetailBlock label={t("payment.billing.nextPaymentLabel")}>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="event" size={22} color="#4e6300" />
              <Text className="text-lg text-on-surface flex-1" style={{ fontFamily: "Manrope_700Bold" }}>
                {nextRenewalFormatted}
              </Text>
            </View>
            <Text
              className="text-xs text-outline mt-2"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("payment.billing.nextPaymentHint")}
            </Text>
          </DetailBlock>

          <DetailBlock label={t("payment.billing.paymentMethodLabel")}>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-14 rounded-lg bg-surface-container-highest items-center justify-center border border-outline-variant/20">
                <MaterialIcons name="credit-card" size={22} color="#4e6300" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-on-surface" style={{ fontFamily: "Inter_600SemiBold" }}>
                  {t("payment.billing.cardBrandMock")}
                </Text>
                <Text className="text-sm text-on-surface-variant mt-1" style={{ fontFamily: "Inter_400Regular" }}>
                  {t("payment.billing.cardMaskedMock")}
                </Text>
              </View>
            </View>
          </DetailBlock>

          <Text
            className="text-[11px] text-outline leading-relaxed mb-6"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("payment.billing.mockDisclaimer")}
          </Text>

          <Pressable onPress={() => router.push("/payment/manage")} className="active:opacity-90">
            <View className="h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary-fixed">
              <MaterialIcons name="swap-horiz" size={22} color="#3a4a00" />
              <Text className="text-base font-bold text-on-primary-fixed" style={{ fontFamily: "Manrope_700Bold" }}>
                {t("payment.billing.changePlanCta")}
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaWrapper>
    </View>
  );
}
