import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import i18n from "../i18n";

let handlerRegistered = false;

function registerForegroundHandler(): void {
  if (handlerRegistered) return;
  handlerRegistered = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function ensureAndroidDefaultChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: i18n.t("notifications.channelName"),
    description: i18n.t("notifications.channelDescription"),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#4e6300",
  });
}

/**
 * Registers the foreground handler, requests OS permission when needed,
 * and creates the Android default notification channel (localized).
 * Safe to call multiple times; web is a no-op.
 */
export async function ensureNotificationSetup(): Promise<void> {
  if (Platform.OS === "web") return;

  registerForegroundHandler();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
  }

  await ensureAndroidDefaultChannel();
}
