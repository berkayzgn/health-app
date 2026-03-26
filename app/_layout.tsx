import "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../global.css";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider } from "react-i18next";
import i18n, { loadStoredLanguage } from "../i18n";
import { useStore } from "../store/useStore";
import { profileNeedsOnboarding } from "../utils/profileNeedsOnboarding";
import { getDesignVars } from "../theme/designVars";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex } from "../theme/designRgb";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5 },
  },
});

function RootLayoutContent() {
  const theme = useStore((s) => s.theme);
  const loadStoredTheme = useStore((s) => s.loadStoredTheme);
  const loadStoredAuth = useStore((s) => s.loadStoredAuth);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const authLoading = useStore((s) => s.authLoading);
  const userProfile = useStore((s) => s.userProfile);
  const router = useRouter();
  const segments = useSegments();
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsSetupRef = useRef(false);
  /**
   * authLoading biter bitmez router.replace bazen Stack henüz mount olmadan çalışıyor (React 19:
   * "state update on component that hasn't mounted yet"). Bir kare bekleyip sonra yönlendir.
   */
  const [stackReadyForNav, setStackReadyForNav] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void loadStoredLanguage({ isActive: () => active });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      void loadStoredTheme();
      void loadStoredAuth();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  /** Bildirim izni + Android kanalı; dil yüklendikten sonra, yalnızca oturum açıkken bir kez. */
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (notificationsSetupRef.current) return;
    notificationsSetupRef.current = true;
    void (async () => {
      await loadStoredLanguage();
      const { ensureNotificationSetup } = await import("../services/notifications");
      await ensureNotificationSetup();
    })();
  }, [authLoading, isAuthenticated]);

  /** Native splash: auth bittikten sonra açık kaldıysa kapat (simülatörde “takılı” hissi). */
  useEffect(() => {
    if (authLoading) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) {
      setStackReadyForNav(false);
      return;
    }
    const raf = requestAnimationFrame(() => {
      setStackReadyForNav(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [authLoading]);

  /** Auth yönlendirmesi: Stack commit edildikten sonra (stackReadyForNav + microtask). */
  useEffect(() => {
    if (authLoading || !stackReadyForNav) return;

    if (navTimeoutRef.current != null) {
      clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = null;
    }

    navTimeoutRef.current = setTimeout(() => {
      navTimeoutRef.current = null;
      if (__DEV__) {
        const seg = [...segments];
        console.log("[boot] auth hazır → segment:", seg, "giriş:", isAuthenticated);
      }
      const inAuth = segments[0] === "auth";
      const onOnboarding = segments[0] === "onboarding";
      const needsOnboarding = profileNeedsOnboarding(userProfile);

      if (!isAuthenticated) {
        if (!inAuth) router.replace("/auth");
        return;
      }

      if (inAuth) {
        router.replace(needsOnboarding ? "/onboarding" : "/");
        return;
      }

      if (needsOnboarding && !onOnboarding) {
        router.replace("/onboarding");
        return;
      }

      if (!needsOnboarding && onOnboarding) {
        router.replace("/");
      }
    }, 0);

    return () => {
      if (navTimeoutRef.current != null) {
        clearTimeout(navTimeoutRef.current);
        navTimeoutRef.current = null;
      }
    };
  }, [stackReadyForNav, authLoading, isAuthenticated, segments, router, userProfile]);

  const accentSpinner = rgbTripletToHex(theme === "dark" ? DARK_RGB.primary : LIGHT_RGB.primary);

  if (authLoading) {
    return (
      <View style={getDesignVars(theme)} className="flex-1 items-center justify-center bg-background">
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <ActivityIndicator size="large" color={accentSpinner} />
      </View>
    );
  }

  return (
    <View style={getDesignVars(theme)} className="flex-1 bg-background">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationTypeForReplace: "push",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="auth" options={{ animation: "fade" }} />
        <Stack.Screen name="onboarding" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack>
    </View>
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
