import { useState } from "react";
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
  Modal,
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
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import AmbientCircles from "../components/AmbientCircles";
import { useStore } from "../store/useStore";
import * as authService from "../services/authService";
import { ApiError } from "../services/api";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex } from "../theme/designRgb";
import { profileNeedsOnboarding } from "../utils/profileNeedsOnboarding";
import { setStoredLanguage } from "../i18n";

export default function AuthScreen() {
  const { t, i18n } = useTranslation();
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

  const [mode, setMode] = useState<"welcome" | "login" | "register">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);

  const passwordsMatch = mode !== "register" || password === confirmPassword;

  const canSubmit =
    mode !== "welcome" &&
    email.trim().length > 0 &&
    password.trim().length >= 6 &&
    (mode !== "register" || confirmPassword.trim().length >= 6) &&
    passwordsMatch &&
    (mode === "login" || name.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      if (mode === "register" && password !== confirmPassword) {
        Alert.alert(t("auth.errorTitle"), t("auth.errors.passwordMismatch"));
        return;
      }
      const res =
        mode === "register"
          ? await authService.register(email.trim(), password, name.trim())
          : await authService.login(email.trim(), password);
      setAuth(res.user, res.access_token);
      const profile = await refreshProfile();
      // Onboarding gate'ini sadece onboarding ekranı / skip set eder.
      const needsOnboarding = profileNeedsOnboarding(profile);
      router.replace(needsOnboarding ? "/onboarding" : "/");
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : t("auth.errorGeneric");

      if (e instanceof ApiError) {
        switch (e.code) {
          case "SESSION_EXPIRED":
            msg = t("auth.errors.sessionExpired");
            break;
          case "AUTH_INVALID_CREDENTIALS":
            msg = t("auth.errors.invalidCredentials");
            break;
          case "AUTH_USER_NOT_FOUND":
            msg = t("auth.errors.userNotFound");
            break;
          case "AUTH_EMAIL_IN_USE":
            msg = t("auth.errors.emailInUse");
            break;
          case "AUTH_WEAK_PASSWORD":
            msg = t("auth.errors.weakPassword");
            break;
          case "RATE_LIMITED":
            msg = t("auth.errors.rateLimited");
            break;
          case "TIMEOUT":
            msg = t("auth.errors.timeout");
            break;
          case "NETWORK_ERROR":
            msg = t("auth.errors.network");
            break;
          default:
            // If backend sent a human-friendly message, keep it.
            msg = e.message || t("auth.errorGeneric");
            break;
        }
      }
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={accentSpinner} />
      </View>
    );
  }

  if (mode === "welcome") {
    return (
      <SafeAreaWrapper className="flex-1" edges={["top", "bottom"]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />

        <View className="flex-1" style={{ backgroundColor: "#f6f6f6" }}>
          {/* Language button (top-right) */}
          <Pressable
            onPress={() => setLanguageSheetOpen(true)}
            hitSlop={10}
            style={({ pressed }) => ({
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 50,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.85)",
              borderWidth: 1,
              borderColor: "rgba(78,99,0,0.14)",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <MaterialIcons name="language" size={22} color="#4e6300" />
          </Pressable>

          {/* Organic blob decorations (approx) */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 320,
              height: 320,
              borderRadius: 9999,
              backgroundColor: "rgba(78,99,0,0.07)",
              transform: [{ scale: 1.5 }],
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 160,
              right: -40,
              width: 192,
              height: 192,
              borderRadius: 9999,
              backgroundColor: "rgba(202,253,0,0.12)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 160,
              left: -64,
              width: 256,
              height: 256,
              borderRadius: 9999,
              backgroundColor: "rgba(78,99,0,0.05)",
            }}
          />

          {/* Main content */}
          <View className="flex-1 justify-end px-8 pb-12 pt-20">
            {/* Label */}
            <View className="mb-6">
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  fontWeight: "500",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "#4e6300",
                }}
              >
                {t("auth.welcomeLabel")}
              </Text>
            </View>

            {/* Display-LG Title */}
            <Text
              style={{
                fontSize: 56,
                fontFamily: "Manrope_800ExtraBold",
                fontWeight: "800",
                letterSpacing: -1.2,
                color: "#2d2f2f",
                lineHeight: 60,
                marginBottom: 20,
              }}
            >
              {t("auth.welcomeTitleLine1")}
              {"\n"}
              {t("auth.welcomeTitleLine2")}
            </Text>

            {/* Neon accent underline */}
            <View
              className="mb-8"
              style={{
                width: 48,
                height: 4,
                backgroundColor: "#cafd00",
                borderRadius: 9999,
              }}
            />

            {/* Subtitle Body-LG */}
            <Text
              style={{
                fontSize: 19,
                fontFamily: "Inter_400Regular",
                fontWeight: "400",
                color: "#5a5c5c",
                lineHeight: 30,
                marginBottom: 48,
                maxWidth: 320,
              }}
            >
              {[t("auth.welcomeSubtitleLine1"), t("auth.welcomeSubtitleLine2")]
                .filter((s) => typeof s === "string" && s.trim().length > 0)
                .join("\n")}
            </Text>

            {/* Feature pills */}
            <View className="flex-row flex-wrap gap-2 mb-10">
              {[t("auth.featurePills.scanner"), t("auth.featurePills.allergy"), t("auth.featurePills.disease")].map(
                (tag) => (
                  <View
                    key={tag}
                    style={{
                      backgroundColor: "rgba(78,99,0,0.07)",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 9999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        fontWeight: "500",
                        color: "#4e6300",
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                ),
              )}
            </View>

            {/* Primary CTA */}
            <Pressable
              onPress={() => setMode("register")}
              className="flex-row items-center justify-center gap-3 w-full py-5"
              style={{
                backgroundColor: "#cafd00",
                borderRadius: 9999,
              }}
            >
              <Text
                style={{
                  fontFamily: "Manrope_700Bold",
                  fontWeight: "700",
                  fontSize: 18,
                  color: "#3a4a00",
                  letterSpacing: -0.3,
                }}
              >
                {t("auth.getStarted")}
              </Text>
              <MaterialIcons name="arrow-forward" size={22} color="#3a4a00" />
            </Pressable>

            {/* Ghost link */}
            <Pressable className="mt-5 w-full items-center active:opacity-70" onPress={() => setMode("login")}>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontWeight: "400",
                  fontSize: 16,
                  color: "#767777",
                }}
              >
                {t("auth.alreadyHaveAccount")}{" "}
                <Text style={{ color: "#4e6300", fontFamily: "Inter_500Medium", fontWeight: "500" }}>
                  {t("auth.signInLink")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>

        <Modal
          visible={languageSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setLanguageSheetOpen(false)}
        >
          <Pressable
            onPress={() => setLanguageSheetOpen(false)}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          >
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                paddingTop: 12,
                paddingBottom: 18,
                paddingHorizontal: 16,
              }}
            >
              <View style={{ alignItems: "center", paddingBottom: 10 }}>
                <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#E6E6E6" }} />
              </View>

              <Text
                style={{
                  fontFamily: "Manrope_700Bold",
                  fontWeight: "700",
                  fontSize: 18,
                  color: "#2d2f2f",
                  marginBottom: 10,
                  paddingHorizontal: 6,
                }}
              >
                {t("settings.languageSheetTitle")}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontWeight: "400",
                  fontSize: 14,
                  color: "#5a5c5c",
                  marginBottom: 14,
                  paddingHorizontal: 6,
                }}
              >
                {t("settings.languageSheetHint")}
              </Text>

              {([
                { code: "en", label: t("settings.languageValueEn") },
                { code: "tr", label: t("settings.languageValueTr") },
              ] as const).map((opt) => {
                const active = (i18n.language ?? "en").startsWith(opt.code);
                return (
                  <Pressable
                    key={opt.code}
                    onPress={async () => {
                      await setStoredLanguage(opt.code);
                      await i18n.changeLanguage(opt.code);
                      setLanguageSheetOpen(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      backgroundColor: active ? "rgba(202,253,0,0.22)" : "#F7F7F7",
                      borderWidth: 1,
                      borderColor: active ? "rgba(78,99,0,0.18)" : "#E8E8E8",
                      marginBottom: 10,
                      opacity: pressed ? 0.88 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontWeight: "600",
                        fontSize: 16,
                        color: "#2d2f2f",
                      }}
                    >
                      {opt.label}
                    </Text>
                    <MaterialIcons name={active ? "check-circle" : "radio-button-unchecked"} size={20} color="#4e6300" />
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => setLanguageSheetOpen(false)}
                style={({ pressed }) => ({
                  marginTop: 6,
                  height: 48,
                  borderRadius: 9999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#efefef",
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", fontWeight: "600", color: "#2d2f2f" }}>
                  {t("settings.languageSheetClose")}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaWrapper>
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
                      className="leading-tight tracking-tight text-on-surface"
                      style={{ fontFamily: "Manrope_800ExtraBold", fontSize: 30, lineHeight: 36 }}
                    >
                      {mode === "login" ? t("auth.welcomeBack") : t("auth.registerTitle")}
                    </Text>
                  </View>

                  <View className="gap-8">
                    {mode === "register" ? (
                      <View className="gap-2">
                        <Text
                          className="ml-1 text-[0.82rem] font-bold uppercase tracking-[0.05em] text-outline"
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
                          className={`min-h-[52px] rounded-card border-2 px-6 py-3 text-[17px] text-on-surface ${
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
                        className="ml-1 text-[0.82rem] font-bold uppercase tracking-[0.05em] text-outline"
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
                        className={`min-h-[52px] rounded-card border-2 px-6 py-3 text-[17px] text-on-surface ${
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
                          className="text-[0.82rem] font-bold uppercase tracking-[0.05em] text-outline"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("auth.passwordLabel")}
                        </Text>
                        {mode === "login" ? (
                          <Pressable onPress={() => Alert.alert(t("auth.comingSoon"))}>
                            <Text
                              className="text-[0.65rem] font-bold uppercase tracking-[0.05em] text-primary"
                              style={{ fontFamily: "Inter_600SemiBold" }}
                            >
                              {t("auth.forgotPassword")}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <View className="relative">
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder={t("auth.passwordPlaceholder")}
                          secureTextEntry={!showPassword}
                          onFocus={() => setPasswordFocus(true)}
                          onBlur={() => setPasswordFocus(false)}
                          className={`min-h-[52px] rounded-card border-2 px-6 py-3 text-[17px] text-on-surface ${
                            passwordFocus
                              ? "border-primary/40 bg-surface-container-lowest"
                              : "border-transparent bg-surface-variant"
                          }`}
                          style={{ fontFamily: "Inter_400Regular", paddingRight: 52 }}
                          placeholderTextColor={placeholderColor}
                        />
                        <Pressable
                          onPress={() => setShowPassword((v) => !v)}
                          hitSlop={10}
                          style={{
                            position: "absolute",
                            right: 14,
                            top: 0,
                            bottom: 0,
                            justifyContent: "center",
                          }}
                        >
                          <MaterialIcons
                            name={showPassword ? "visibility-off" : "visibility"}
                            size={20}
                            color={rgbTripletToHex(palette["outline"])}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {mode === "register" ? (
                      <View className="gap-2">
                        <Text
                          className="ml-1 text-[0.82rem] font-bold uppercase tracking-[0.05em] text-outline"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("auth.confirmPasswordLabel")}
                        </Text>
                        <View className="relative">
                          <TextInput
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder={t("auth.confirmPasswordPlaceholder")}
                            secureTextEntry={!showConfirmPassword}
                            onFocus={() => setConfirmPasswordFocus(true)}
                            onBlur={() => setConfirmPasswordFocus(false)}
                            className={`min-h-[52px] rounded-card border-2 px-6 py-3 text-[17px] text-on-surface ${
                              confirmPasswordFocus
                                ? "border-primary/40 bg-surface-container-lowest"
                                : passwordsMatch
                                  ? "border-transparent bg-surface-variant"
                                  : "border-red-500/60 bg-surface-variant"
                            }`}
                            style={{ fontFamily: "Inter_400Regular", paddingRight: 52 }}
                            placeholderTextColor={placeholderColor}
                          />
                          <Pressable
                            onPress={() => setShowConfirmPassword((v) => !v)}
                            hitSlop={10}
                            style={{
                              position: "absolute",
                              right: 14,
                              top: 0,
                              bottom: 0,
                              justifyContent: "center",
                            }}
                          >
                            <MaterialIcons
                              name={showConfirmPassword ? "visibility-off" : "visibility"}
                              size={20}
                              color={rgbTripletToHex(palette["outline"])}
                            />
                          </Pressable>
                        </View>
                        {!passwordsMatch && confirmPassword.length > 0 ? (
                          <Text
                            className="ml-1 text-[0.75rem] text-red-600"
                            style={{ fontFamily: "Inter_400Regular" }}
                          >
                            {t("auth.errors.passwordMismatch")}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    <Pressable
                      onPress={submit}
                      disabled={!canSubmit || loading}
                      className="min-h-[52px] py-3 flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed active:opacity-90"
                      style={{ opacity: !canSubmit || loading ? 0.55 : 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color={rgbTripletToHex(palette["on-primary-fixed"])} />
                      ) : (
                        <>
                          <Text
                            className="font-bold text-on-primary-fixed"
                            style={{ fontFamily: "Manrope_700Bold", fontSize: 17 }}
                          >
                            {mode === "login" ? t("auth.signIn") : t("auth.createAccountCta")}
                          </Text>
                          <MaterialIcons
                            name="arrow-forward"
                            size={22}
                            color={rgbTripletToHex(palette["on-primary-fixed"])}
                          />
                        </>
                      )}
                    </Pressable>
                  </View>

                  <View className="mt-10 items-center">
                    {mode === "login" ? (
                      <Text
                        className="text-center text-[0.95rem] text-on-surface-variant"
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
                        className="text-center text-[0.95rem] text-on-surface-variant"
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
