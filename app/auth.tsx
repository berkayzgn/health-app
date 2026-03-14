import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import { getThemeColors } from "../theme";
import * as authService from "../services/authService";

export default function AuthScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const theme = useStore((s) => s.theme);
    const setAuth = useStore((s) => s.setAuth);
    const c = getThemeColors(theme);

    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const canSubmit =
        email.trim().length > 0 &&
        password.trim().length >= 6 &&
        (mode === "login" || name.trim().length > 0);

    const handleSubmit = async () => {
        if (!canSubmit || loading) return;
        setLoading(true);

        try {
            let response;
            if (mode === "register") {
                response = await authService.register(
                    email.trim(),
                    password,
                    name.trim()
                );
            } else {
                response = await authService.login(email.trim(), password);
            }

            setAuth(response.user, response.access_token);
            router.replace("/");
        } catch (error: any) {
            Alert.alert(
                t("auth.error"),
                error.message || t("auth.genericError")
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView
            style={{ backgroundColor: c.background }}
            className="flex-1"
            edges={["top", "bottom"]}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="px-6 py-8">
                        {/* Logo / Header */}
                        <View className="items-center mb-10">
                            <View
                                className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
                                style={{ backgroundColor: c.accentMuted }}
                            >
                                <Ionicons name="heart-outline" size={40} color={c.accent} />
                            </View>
                            <Text
                                style={{ color: c.text }}
                                className="text-2xl font-bold text-center"
                            >
                                Health AI
                            </Text>
                            <Text
                                style={{ color: c.textMuted }}
                                className="text-sm mt-1 text-center"
                            >
                                {mode === "login"
                                    ? t("auth.loginSubtitle")
                                    : t("auth.registerSubtitle")}
                            </Text>
                        </View>

                        {/* Toggle */}
                        <View
                            style={{ backgroundColor: c.surfaceAlt }}
                            className="flex-row rounded-xl p-1 mb-6"
                        >
                            <Pressable
                                onPress={() => setMode("login")}
                                style={{
                                    backgroundColor:
                                        mode === "login" ? c.surface : "transparent",
                                }}
                                className="flex-1 py-3 rounded-lg"
                            >
                                <Text
                                    style={{
                                        color: mode === "login" ? c.accent : c.textMuted,
                                    }}
                                    className="font-semibold text-center text-sm"
                                >
                                    {t("auth.login")}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setMode("register")}
                                style={{
                                    backgroundColor:
                                        mode === "register" ? c.surface : "transparent",
                                }}
                                className="flex-1 py-3 rounded-lg"
                            >
                                <Text
                                    style={{
                                        color: mode === "register" ? c.accent : c.textMuted,
                                    }}
                                    className="font-semibold text-center text-sm"
                                >
                                    {t("auth.register")}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Name (register only) */}
                        {mode === "register" && (
                            <View className="mb-4">
                                <Text
                                    style={{ color: c.textSecondary }}
                                    className="text-sm font-semibold mb-2"
                                >
                                    {t("auth.name")}
                                </Text>
                                <View
                                    style={{
                                        backgroundColor: c.surface,
                                        borderColor: c.border,
                                    }}
                                    className="flex-row items-center border rounded-xl px-4"
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={20}
                                        color={c.iconMuted}
                                    />
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        placeholder={t("auth.namePlaceholder")}
                                        placeholderTextColor={c.placeholder}
                                        style={{ color: c.text }}
                                        className="flex-1 py-4 ml-3 text-base"
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>
                        )}

                        {/* Email */}
                        <View className="mb-4">
                            <Text
                                style={{ color: c.textSecondary }}
                                className="text-sm font-semibold mb-2"
                            >
                                {t("auth.email")}
                            </Text>
                            <View
                                style={{
                                    backgroundColor: c.surface,
                                    borderColor: c.border,
                                }}
                                className="flex-row items-center border rounded-xl px-4"
                            >
                                <Ionicons
                                    name="mail-outline"
                                    size={20}
                                    color={c.iconMuted}
                                />
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder={t("auth.emailPlaceholder")}
                                    placeholderTextColor={c.placeholder}
                                    style={{ color: c.text }}
                                    className="flex-1 py-4 ml-3 text-base"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View className="mb-6">
                            <Text
                                style={{ color: c.textSecondary }}
                                className="text-sm font-semibold mb-2"
                            >
                                {t("auth.password")}
                            </Text>
                            <View
                                style={{
                                    backgroundColor: c.surface,
                                    borderColor: c.border,
                                }}
                                className="flex-row items-center border rounded-xl px-4"
                            >
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color={c.iconMuted}
                                />
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder={t("auth.passwordPlaceholder")}
                                    placeholderTextColor={c.placeholder}
                                    style={{ color: c.text }}
                                    className="flex-1 py-4 ml-3 text-base"
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={22}
                                        color={c.iconMuted}
                                    />
                                </Pressable>
                            </View>
                            <Text
                                style={{ color: c.textMuted }}
                                className="text-xs mt-1.5 ml-1"
                            >
                                {t("auth.passwordHint")}
                            </Text>
                        </View>

                        {/* Submit */}
                        <Pressable
                            onPress={handleSubmit}
                            disabled={!canSubmit || loading}
                            style={{
                                backgroundColor: canSubmit ? c.accent : c.surfaceAlt,
                            }}
                            className="py-4 rounded-xl active:opacity-90"
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text
                                    style={{ color: canSubmit ? "white" : c.textMuted }}
                                    className="font-semibold text-base text-center"
                                >
                                    {mode === "login"
                                        ? t("auth.loginButton")
                                        : t("auth.registerButton")}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
