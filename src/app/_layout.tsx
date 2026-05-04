import "react-native-gesture-handler";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Dimensions, Image, Modal, StyleSheet, View } from "react-native";
import "../../global.css";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nextProvider } from "react-i18next";
import i18n, { loadStoredLanguage } from "../i18n";
import { useStore } from "../store/useStore";
import { profileNeedsOnboarding } from "../utils/profileNeedsOnboarding";
import { getDesignVars } from "../theme/designVars";
import { registerUnauthorizedCallback } from "../services/api";

void SplashScreen.preventAutoHideAsync();

/** `assets/splash.png` ve `app.json` splash zemini ile aynı. */
const SPLASH_SCREEN_BG = "#DFFF00";
const MIN_SPLASH_VISIBLE_MS = 1000;
const HOLD_SPLASH_SCREEN = false;
const SPLASH_ASSET_WIDTH = 6000;
const SPLASH_ASSET_HEIGHT = 3375;
const SPLASH_VISIBLE_CENTER_X = 3044;
const SPLASH_VISIBLE_CENTER_Y = 1902;

function BootNavigationEffects() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const authLoading = useStore((s) => s.authLoading);
  const userProfile = useStore((s) => s.userProfile);
  const onboardingGateComplete = useStore((s) => s.onboardingGateComplete);
  const router = useRouter();
  const segments = useSegments();
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stackReadyForNav, setStackReadyForNav] = useState(false);

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
      const needsOnboarding = profileNeedsOnboarding(userProfile) && !onboardingGateComplete;

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
  }, [
    stackReadyForNav,
    authLoading,
    isAuthenticated,
    segments,
    router,
    userProfile,
    onboardingGateComplete,
  ]);

  return null;
}

function RootStackShell({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.theme);

  return (
    <View style={[{ flex: 1 }, getDesignVars(theme)]}>
      <BootNavigationEffects />
      {children}
    </View>
  );
}

function RootLayoutContent() {
  const theme = useStore((s) => s.theme);
  const loadStoredTheme = useStore((s) => s.loadStoredTheme);
  const loadStoredAuth = useStore((s) => s.loadStoredAuth);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const authLoading = useStore((s) => s.authLoading);
  const clearAuth = useStore((s) => s.clearAuth);
  const notificationsSetupRef = useRef(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    registerUnauthorizedCallback(() => {
      clearAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, MIN_SPLASH_VISIBLE_MS);

    return () => clearTimeout(timer);
  }, []);

  const showSplash = HOLD_SPLASH_SCREEN || authLoading || !minSplashElapsed;

  useEffect(() => {
    if (!minSplashElapsed) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [minSplashElapsed]);

  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const splashImageWidth = windowWidth * 1.65;
  const splashImageHeight = Math.min(windowHeight * 0.82, 760);
  const splashImageScale = Math.min(
    splashImageWidth / SPLASH_ASSET_WIDTH,
    splashImageHeight / SPLASH_ASSET_HEIGHT,
  );
  const splashOffsetX = -(SPLASH_VISIBLE_CENTER_X - SPLASH_ASSET_WIDTH / 2) * splashImageScale;
  const splashOffsetY = -(SPLASH_VISIBLE_CENTER_Y - SPLASH_ASSET_HEIGHT / 2) * splashImageScale;

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenLayout={({ children }) => <RootStackShell>{children}</RootStackShell>}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationTypeForReplace: "push",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="auth" options={{ animation: "fade" }} />
        <Stack.Screen name="onboarding" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="payment" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack>
      <Modal
        animationType="none"
        transparent={false}
        visible={showSplash}
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: SPLASH_SCREEN_BG }]}>
          <StatusBar style="dark" />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image
              accessibilityIgnoresInvertColors
              source={require("../../assets/splash.png")}
              resizeMode="contain"
              style={{
                width: splashImageWidth,
                height: splashImageHeight,
                alignSelf: "center",
                transform: [{ translateX: splashOffsetX }, { translateY: splashOffsetY }],
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <RootLayoutContent />
    </I18nextProvider>
  );
}
