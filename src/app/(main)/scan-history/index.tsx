import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import SafeAreaWrapper from "../../../components/SafeAreaWrapper";
import AppHeader from "../../../components/AppHeader";
import { useStore } from "../../../store/useStore";
import { getScanHistory, type ScanHistoryItem } from "../../../services/labelScanService";

function safetyIcon(name: ScanHistoryItem["safetyLabel"]) {
  if (name === "safe") return "check-decagram" as const;
  if (name === "caution") return "alert-decagram" as const;
  return "close-octagon" as const;
}

export default function ScanHistoryListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          setError(false);
          const list = await getScanHistory(50);
          if (!cancelled) setItems(list);
        } catch {
          if (!cancelled) {
            setItems([]);
            setError(true);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const bottomPad = 16 + Math.max(insets.bottom, 12);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="inner" title={t("scanHistory.listTitle")} />

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
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#4e6300" className="py-12" />
            ) : error ? (
              <Text className="text-on-surface-variant text-sm py-6" style={{ fontFamily: "Inter_400Regular" }}>
                {t("scanHistory.loadError")}
              </Text>
            ) : items.length === 0 ? (
              <Text className="text-on-surface-variant text-sm py-6" style={{ fontFamily: "Inter_400Regular" }}>
                {t("scanHistory.empty")}
              </Text>
            ) : (
              <View className="gap-3">
                {items.map((item) => {
                  const labelKey = `labelScan.${item.safetyLabel}` as const;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/scan-history/${item.id}`)}
                      className="rounded-2xl bg-surface-container-lowest px-4 py-4 shadow-ambient border border-outline-variant/10 active:opacity-90"
                    >
                      <View className="flex-row items-start gap-3">
                        <MaterialCommunityIcons
                          name={safetyIcon(item.safetyLabel)}
                          size={28}
                          color={
                            item.safetyLabel === "safe"
                              ? "#4e6300"
                              : item.safetyLabel === "caution"
                                ? "#f5a623"
                                : "#b02500"
                          }
                        />
                        <View className="flex-1 min-w-0">
                          <Text
                            className="text-on-surface font-headline font-bold text-base"
                            numberOfLines={2}
                            style={{ fontFamily: "Manrope_700Bold" }}
                          >
                            {item.productTitle || "—"}
                          </Text>
                          <Text
                            className="text-outline text-xs mt-1"
                            style={{ fontFamily: "Inter_500Medium" }}
                          >
                            {new Date(item.scannedAt).toLocaleString()}
                          </Text>
                          <Text
                            className="text-on-surface-variant text-sm mt-2"
                            style={{ fontFamily: "Inter_600SemiBold" }}
                          >
                            {t(labelKey)}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={22} color="#767777" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
