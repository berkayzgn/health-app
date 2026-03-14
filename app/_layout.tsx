import { useEffect } from "react";
import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider } from "react-i18next";
import i18n, { loadStoredLanguage } from "../i18n";
import { useStore } from "../store/useStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

function RootLayoutContent() {
  const theme = useStore((s) => s.theme);
  const loadStoredTheme = useStore((s) => s.loadStoredTheme);
  const loadStoredAuth = useStore((s) => s.loadStoredAuth);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const authLoading = useStore((s) => s.authLoading);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  useEffect(() => {
    loadStoredTheme();
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const inAuthScreen = segments[0] === "auth";

    if (!isAuthenticated && !inAuthScreen) {
      router.replace("/auth");
    } else if (isAuthenticated && inAuthScreen) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, segments]);

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="auth" options={{ animation: "fade" }} />
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="history" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="meal-description" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}
