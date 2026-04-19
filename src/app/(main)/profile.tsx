import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";
import { formatConditionTypesSummary } from "../../utils/conditionTypesDisplay";

const EMPTY = "—";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const authUser = useStore((s) => s.authUser);
  const userProfile = useStore((s) => s.userProfile);
  const theme = useStore((s) => s.theme);
  const medicalConditions = useStore((s) => s.medicalConditions);
  const medicalConditionsLoaded = useStore((s) => s.medicalConditionsLoaded);
  const loadMedicalConditions = useStore((s) => s.loadMedicalConditions);

  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";

  useEffect(() => {
    if (!medicalConditionsLoaded) loadMedicalConditions();
  }, [medicalConditionsLoaded, loadMedicalConditions]);

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const bottomPad = 24 + Math.max(insets.bottom, 12);
  const comingSoon = () => Alert.alert(t("auth.comingSoon"));

  const displayName =
    userProfile?.name?.trim() ||
    authUser?.name?.trim() ||
    authUser?.email?.split("@")[0]?.trim() ||
    t("settings.accountGuest");

  const conditionsSummary = formatConditionTypesSummary(userProfile?.conditionTypes, lang, medicalConditions);
  const diseaseDisplay = conditionsSummary || EMPTY;

  const avatarSize = isWide ? 160 : 128;
  const initials = initialsFromName(displayName);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="inner" title={t("layout.headerProfile")} />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: bottomPad,
              maxWidth: 960,
              width: "100%",
              alignSelf: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="relative mb-12 overflow-hidden rounded-[1rem] bg-surface-container-lowest p-8 shadow-ambient">
              <View
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-fixed/10"
                pointerEvents="none"
              />

              <View
                className={`relative z-10 gap-8 ${isWide ? "flex-row items-end" : "flex-col items-center"}`}
              >
                <View className={`relative ${isWide ? "" : "items-center"}`}>
                  <View
                    className="items-center justify-center rounded-full border-4 border-surface bg-surface-container-highest shadow-sm"
                    style={{ width: avatarSize, height: avatarSize }}
                  >
                    <Text
                      className="text-on-surface"
                      style={{
                        fontFamily: "Manrope_800ExtraBold",
                        fontSize: avatarSize * 0.28,
                        lineHeight: avatarSize * 0.32,
                      }}
                    >
                      {initials}
                    </Text>
                  </View>
                  <View className="absolute bottom-1 right-1 rounded-full border-2 border-surface-container-lowest bg-primary-fixed p-1.5 shadow-lg">
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#3a4a00" />
                  </View>
                </View>

                <View className={`min-w-0 flex-1 ${isWide ? "items-start" : "items-center"}`}>
                  <Text
                    className="text-on-surface"
                    style={{
                      fontFamily: "Manrope_800ExtraBold",
                      fontSize: 34,
                      lineHeight: 40,
                      letterSpacing: -0.5,
                    }}
                    numberOfLines={2}
                  >
                    {displayName}
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.push("/edit-health-profile")}
                  className={`z-10 h-14 flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed active:opacity-90 ${isWide ? "px-8 self-end" : "w-full"}`}
                >
                  <MaterialIcons name="edit" size={20} color="#3a4a00" />
                  <Text
                    className="text-base font-bold text-on-primary-fixed"
                    style={{ fontFamily: "Manrope_700Bold" }}
                  >
                    {t("profile.editProfile")}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="bg-surface-container-low rounded-[1rem] p-8 mb-8">
              <View className="flex-row justify-between items-center mb-8">
                <Text className="font-headline text-xl font-bold text-on-surface">
                  {t("profile.healthIdentity")}
                </Text>
                <MaterialCommunityIcons name="shield-check" size={24} color="#767777" />
              </View>
              <View className="gap-3">
                <View className="w-full bg-surface-container-lowest p-5 rounded-[0.75rem]">
                  <Text className="text-outline text-[11px] font-bold uppercase tracking-wider mb-2">
                    {t("profile.diseaseType")}
                  </Text>
                  <Text className="text-xl font-headline text-on-surface leading-7">
                    {diseaseDisplay}
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-primary rounded-[1rem] p-8 overflow-hidden relative mb-4">
              <View className="relative z-10">
                <Text className="font-headline text-lg font-bold text-on-primary mb-2">
                  {t("profile.supportTitle")}
                </Text>
                <Text className="text-sm text-on-primary/80 mb-6 leading-relaxed">
                  {t("profile.supportBody")}
                </Text>
                <Pressable
                  onPress={comingSoon}
                  className="w-full bg-surface-container-lowest rounded-full py-3 active:opacity-90"
                >
                  <Text className="text-center text-primary text-sm font-bold">
                    {t("profile.supportCta")}
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
