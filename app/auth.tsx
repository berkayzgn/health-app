import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
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
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import AmbientCircles from "../components/AmbientCircles";
import { useStore } from "../store/useStore";
import * as authService from "../services/authService";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex } from "../theme/designRgb";

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuth = useStore((s) => s.setAuth);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const theme = useStore((s) => s.theme);
  const { width } = useWindowDimensions();
  const palette = theme === "dark" ? DARK_RGB : LIGHT_RGB;
  const placeholderColor = rgbTripletToHex(palette["outline-variant"]);
  const onSurfaceIcon = rgbTripletToHex(palette["on-surface"]);
  const accentSpinner = rgbTripletToHex(palette.primary);
  const showHeaderLinks = width >= 768;

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length >= 6 &&
    (mode === "login" || name.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const res =
        mode === "register"
          ? await authService.register(email.trim(), password, name.trim())
          : await authService.login(email.trim(), password);
      setAuth(res.user, res.access_token);
      await refreshProfile();
      router.replace("/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("auth.errorGeneric");
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setLoading(false);
    }
  };

  const onSocial = useCallback(
    (provider: "google" | "apple") => {
      Alert.alert(t("auth.comingSoon"), `${provider === "google" ? "Google" : "Apple"} — ${t("auth.comingSoon")}`);
    },
    [t],
  );

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={accentSpinner} />
      </View>
    );
  }

  return (
    <SafeAreaWrapper className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="relative flex-1 overflow-hidden">
            <AmbientCircles preset="auth" instanceId={0} />

            <View className="relative z-10 flex-1">
              {/* Header */}
              <View className="mx-auto w-full max-w-7xl flex-row items-center justify-between px-6 py-6">
                <Text
                  className="text-xl tracking-tighter text-on-surface"
                  style={{ fontFamily: "Manrope_800ExtraBold" }}
                >
                  {t("common.appName")}
                </Text>
                {showHeaderLinks ? (
                  <View className="flex-row items-center gap-8">
                    <Pressable>
                      <Text
                        className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("auth.support")}
                      </Text>
                    </Pressable>
                    <Pressable>
                      <Text
                        className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("auth.privacy")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View className="flex-1 justify-center px-6 pb-8">
                <View
                  className="w-full max-w-[480px] self-center rounded-card border border-outline-variant/15 bg-surface-container-lowest"
                  style={{
                    paddingHorizontal: width >= 768 ? 40 : 32,
                    paddingVertical: width >= 768 ? 40 : 32,
                    shadowColor: onSurfaceIcon,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: theme === "dark" ? 0.35 : 0.08,
                    shadowRadius: 24,
                    elevation: 8,
                  }}
                >
                  <View className="mb-8">
                    <Text
                      className="text-[2rem] leading-tight tracking-tight text-on-surface"
                      style={{ fontFamily: "Manrope_800ExtraBold" }}
                    >
                      {mode === "login" ? t("auth.welcomeBack") : t("auth.registerTitle")}
                    </Text>
                  </View>

                  <View className="gap-8">
                    {mode === "register" ? (
                      <View className="gap-2">
                        <Text
                          className="ml-1 text-[0.75rem] font-bold uppercase tracking-[0.05em] text-outline"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("auth.name")}
                        </Text>
                        <TextInput
                          value={name}
                          onChangeText={setName}
                          placeholder={t("auth.name")}
                          onFocus={() => setNameFocus(true)}
                          onBlur={() => setNameFocus(false)}
                          className={`h-14 rounded-card border-2 px-6 text-base text-on-surface ${
                            nameFocus
                              ? "border-primary/40 bg-surface-container-lowest"
                              : "border-transparent bg-surface-variant"
                          }`}
                          style={{ fontFamily: "Inter_400Regular" }}
                          placeholderTextColor={placeholderColor}
                          autoCapitalize="words"
                        />
                      </View>
                    ) : null}

                    <View className="gap-2">
                      <Text
                        className="ml-1 text-[0.75rem] font-bold uppercase tracking-[0.05em] text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("auth.emailLabel")}
                      </Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder={t("auth.emailPlaceholder")}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onFocus={() => setEmailFocus(true)}
                        onBlur={() => setEmailFocus(false)}
                        className={`h-14 rounded-card border-2 px-6 text-base text-on-surface ${
                          emailFocus
                            ? "border-primary/40 bg-surface-container-lowest"
                            : "border-transparent bg-surface-variant"
                        }`}
                        style={{ fontFamily: "Inter_400Regular" }}
                        placeholderTextColor={placeholderColor}
                      />
                    </View>

                    <View className="gap-2">
                      <View className="ml-1 flex-row items-center justify-between">
                        <Text
                          className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-outline"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("auth.passwordLabel")}
                        </Text>
                        <Pressable onPress={() => Alert.alert(t("auth.comingSoon"))}>
                          <Text
                            className="text-[0.65rem] font-bold uppercase tracking-[0.05em] text-primary"
                            style={{ fontFamily: "Inter_600SemiBold" }}
                          >
                            {t("auth.forgotPassword")}
                          </Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t("auth.passwordPlaceholder")}
                        secureTextEntry
                        onFocus={() => setPasswordFocus(true)}
                        onBlur={() => setPasswordFocus(false)}
                        className={`h-14 rounded-card border-2 px-6 text-base text-on-surface ${
                          passwordFocus
                            ? "border-primary/40 bg-surface-container-lowest"
                            : "border-transparent bg-surface-variant"
                        }`}
                        style={{ fontFamily: "Inter_400Regular" }}
                        placeholderTextColor={placeholderColor}
                      />
                    </View>

                    <Pressable
                      onPress={submit}
                      disabled={!canSubmit || loading}
                      className="h-14 flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed active:opacity-90"
                      style={{ opacity: !canSubmit || loading ? 0.55 : 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color={rgbTripletToHex(palette["on-primary-fixed"])} />
                      ) : (
                        <>
                          <Text
                            className="text-lg font-bold text-on-primary-fixed"
                            style={{ fontFamily: "Manrope_700Bold" }}
                          >
                            {mode === "login" ? t("auth.signIn") : t("auth.createAccountCta")}
                          </Text>
                          <MaterialIcons
                            name="arrow-forward"
                            size={20}
                            color={rgbTripletToHex(palette["on-primary-fixed"])}
                          />
                        </>
                      )}
                    </Pressable>
                  </View>

                  <View className="relative my-10 flex-row items-center">
                    <View className="h-[1px] flex-1 bg-surface-variant opacity-40" />
                    <Text
                      className="mx-4 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-outline-variant"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("auth.orContinueWith")}
                    </Text>
                    <View className="h-[1px] flex-1 bg-surface-variant opacity-40" />
                  </View>

                  <View className="gap-4">
                    <Pressable
                      onPress={() => onSocial("google")}
                      className="h-14 flex-row items-center justify-center gap-3 rounded-pill border border-outline-variant/40 active:bg-surface-container-low"
                    >
                      <MaterialCommunityIcons name="google" size={22} color={onSurfaceIcon} />
                      <Text
                        className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("auth.continueGoogle")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onSocial("apple")}
                      className="h-14 flex-row items-center justify-center gap-3 rounded-pill border border-outline-variant/40 active:bg-surface-container-low"
                    >
                      <MaterialCommunityIcons name="apple" size={24} color={onSurfaceIcon} />
                      <Text
                        className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("auth.continueApple")}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="mt-10 items-center">
                    {mode === "login" ? (
                      <Text
                        className="text-center text-[0.875rem] text-on-surface-variant"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {t("auth.newUserPrompt")}{" "}
                        <Text
                          onPress={() => setMode("register")}
                          className="font-bold text-primary"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("auth.createAccountLink")}
                        </Text>
                      </Text>
                    ) : (
                      <Text
                        className="text-center text-[0.875rem] text-on-surface-variant"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {t("auth.haveAccount")}{" "}
                        <Text
                          onPress={() => setMode("login")}
                          className="font-bold text-primary"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("auth.signInLink")}
                        </Text>
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
