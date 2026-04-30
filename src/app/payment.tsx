import { useMemo, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import AppHeader from "../components/AppHeader";
import { useStore } from "../store/useStore";

type PlanId = "starter" | "plus" | "pro";

function FeatureRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <MaterialIcons name="check-circle" size={18} color="#4e6300" />
      <Text className="text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
        {text}
      </Text>
    </View>
  );
}

function SubscriptionCard({
  tone,
  kicker,
  title,
  icon,
  features,
  priceTitle,
  ctaLabel,
  ctaVariant,
  selected,
  recommendedLabel,
  onPress,
}: {
  tone: "starter" | "plus" | "pro";
  kicker: string;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  features: string[];
  priceTitle: string;
  ctaLabel: string;
  ctaVariant: "outline" | "filled" | "strongOutline";
  selected: boolean;
  recommendedLabel?: string;
  onPress: () => void;
}) {
  const base =
    ctaVariant === "filled"
      ? "bg-primary-fixed"
      : ctaVariant === "strongOutline"
        ? "border-2 border-on-surface bg-transparent"
        : "border border-outline-variant/20 bg-transparent";

  const ctaText =
    ctaVariant === "filled" ? "text-on-primary-fixed" : ctaVariant === "strongOutline" ? "text-on-surface" : "text-primary";

  const toneClasses =
    tone === "starter"
      ? "bg-surface-container-low border border-outline-variant/20"
      : tone === "plus"
        ? "bg-primary-container/10 border-2 border-primary-container shadow-[0_20px_40px_-10px_rgba(78,99,0,0.08)]"
        : "bg-tertiary-container/15 border-2 border-tertiary/30";

  const selectedRing =
    selected ? "ring-2 ring-primary/25" : "";

  return (
    <Pressable onPress={onPress} className="active:opacity-90">
      <View
        className={`relative rounded-3xl p-5 ${toneClasses} ${selectedRing}`}
      >
        {recommendedLabel ? (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 16,
            }}
            className="rounded-full bg-primary-container px-4 py-1.5"
          >
            <Text
              className="text-[10px] uppercase tracking-[0.14em] text-on-primary-fixed"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {recommendedLabel}
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-start justify-between mb-6">
          <View className="gap-1">
            <Text
              className={`text-xs uppercase tracking-[0.18em] ${selected ? "text-primary" : "text-outline"}`}
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {kicker}
            </Text>
            <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
              {title}
            </Text>
          </View>
          <MaterialIcons name={icon} size={24} color={selected ? "#4e6300" : "#767777"} />
        </View>

        <View className="gap-3 mb-6">
          {/* Compact mode: show the primary (first) benefit to fit 3 cards on one screen. */}
          {features.slice(0, 1).map((f) => (
            <FeatureRow key={f} text={f} />
          ))}
        </View>

        <View className="flex-row items-end justify-between">
          <Pressable onPress={onPress} className="active:opacity-90">
            <View className={`rounded-full px-5 py-2.5 ${base}`}>
              <Text className={`text-sm font-bold ${ctaText}`} style={{ fontFamily: "Inter_600SemiBold" }}>
                {ctaLabel}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Price badge: bottom-right, sits on border */}
        <View
          style={{ position: "absolute", right: 16, bottom: 14 }}
          className={`rounded-full border px-3 py-1.5 ${
            tone === "starter"
              ? "border-outline-variant/30 bg-surface-container-lowest"
              : tone === "plus"
                ? "border-primary-container/60 bg-primary-container/25"
                : "border-tertiary/40 bg-tertiary-container/25"
          }`}
        >
          <Text className="text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
            {priceTitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function formatPriceLine(main: string, suffix?: string) {
  if (!suffix) return main;
  return (
    <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
      {main}
      <Text className="text-sm text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
        {suffix}
      </Text>
    </Text>
  );
}

function ProPrice({ amount, suffix }: { amount: string; suffix: string }) {
  return (
    <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
      {amount}
      <Text className="text-sm text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
        {suffix}
      </Text>
    </Text>
  );
}

function PriceBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View className="items-end">
      <Text className="text-[10px] uppercase tracking-tight text-outline" style={{ fontFamily: "Inter_500Medium" }}>
        {label}
      </Text>
      {value}
    </View>
  );
}

function PlusPrice({ amount, suffix }: { amount: string; suffix: string }) {
  return (
    <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
      {amount}
      <Text className="text-sm text-on-surface-variant" style={{ fontFamily: "Inter_400Regular" }}>
        {suffix}
      </Text>
    </Text>
  );
}

function StarterPrice({ value }: { value: string }) {
  return (
    <Text className="text-2xl text-on-surface" style={{ fontFamily: "Manrope_800ExtraBold" }}>
      {value}
    </Text>
  );
}

function PlanStack({
  selected,
  onSelect,
  t,
}: {
  selected: PlanId | null;
  onSelect: (id: PlanId) => void;
  t: (k: string) => string;
}) {
  return (
    <View className="gap-4">
      <SubscriptionCard
        tone="starter"
        kicker={t("payment.cards.starter.kicker")}
        title={t("payment.cards.starter.title")}
        icon="card-membership"
        features={[
          t("payment.cards.starter.features.0"),
          t("payment.cards.starter.features.1"),
          t("payment.cards.starter.features.2"),
        ]}
        ctaLabel={t("payment.cards.starter.cta")}
        ctaVariant="outline"
        priceTitle={t("payment.cards.starter.price")}
        selected={selected === "starter"}
        onPress={() => onSelect("starter")}
      />

      <SubscriptionCard
        tone="plus"
        kicker={t("payment.cards.plus.kicker")}
        title={t("payment.cards.plus.title")}
        icon="monitor-heart"
        features={[
          t("payment.cards.plus.features.0"),
          t("payment.cards.plus.features.1"),
          t("payment.cards.plus.features.2"),
        ]}
        ctaLabel={t("payment.cards.plus.cta")}
        ctaVariant="filled"
        priceTitle={t("payment.cards.plus.priceMain")}
        recommendedLabel={t("payment.cards.plus.recommended")}
        selected={selected === "plus"}
        onPress={() => onSelect("plus")}
      />

      <SubscriptionCard
        tone="pro"
        kicker={t("payment.cards.pro.kicker")}
        title={t("payment.cards.pro.title")}
        icon="restaurant"
        features={[
          t("payment.cards.pro.features.0"),
          t("payment.cards.pro.features.1"),
          t("payment.cards.pro.features.2"),
        ]}
        ctaLabel={t("payment.cards.pro.cta")}
        ctaVariant="strongOutline"
        priceTitle={t("payment.cards.pro.priceMain")}
        selected={selected === "pro"}
        onPress={() => onSelect("pro")}
      />
    </View>
  );
}

export default function PaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [plan, setPlan] = useState<PlanId | null>(null);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-background" />;
  }

  const onBack = () => {
    router.back();
  };

  const onPrimaryAction = () => {
    // ödeme kontrolü yok: seçimi kaydetmiyoruz, sadece akıştan devam ettiriyoruz.
    Alert.alert(t("payment.mockTitle"), t("payment.mockBody"));
    router.replace("/");
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-background" edges={["top", "bottom"]}>
        <AppHeader
          variant="inner"
          title={t("payment.headerTitle")}
          onBack={onBack}
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 14,
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 16),
            maxWidth: 720,
            width: "100%",
            alignSelf: "center",
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-4">
            <Text className="text-on-surface-variant text-lg leading-relaxed" style={{ fontFamily: "Inter_400Regular" }}>
              {t("payment.editorialSubtitle")}
            </Text>
          </View>

          <PlanStack selected={plan} onSelect={setPlan} t={t} />

          <View className="flex-1" />
        </ScrollView>

        {plan ? (
          <View className="bg-background px-6 pt-3 pb-6 border-t border-outline-variant/20">
            <Pressable onPress={onPrimaryAction} className="active:opacity-90">
              <View className="h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary-fixed">
                <Text className="text-base font-bold text-on-primary-fixed" style={{ fontFamily: "Manrope_700Bold" }}>
                  {t("payment.primaryCta")}
                </Text>
                <MaterialIcons name="arrow-forward" size={22} color="#3a4a00" />
              </View>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaWrapper>
    </View>
  );
}

