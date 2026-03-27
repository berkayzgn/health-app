import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  InteractionManager,
} from "react-native";
import * as Device from "expo-device";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import { useStore } from "../../store/useStore";
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
  launchCameraForMeal,
  launchImageLibrary,
} from "../../utils/mediaImagePick";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  time: string;
  text?: string;
  kind: "text" | "image";
  imageUri?: string;
  /** AI balonunda alt aksiyonlar */
  actions?: { key: string; labelKey: string }[];
};

function bubbleTimeClass(role: ChatRole) {
  return role === "assistant"
    ? "ml-2 self-start text-[10px] font-label font-medium uppercase tracking-wider text-outline"
    : "mr-2 self-end text-[10px] font-label font-medium uppercase tracking-wider text-outline";
}

export default function MealChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useStore((s) => s.theme);
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const now = new Date().toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: "user",
        kind: "text",
        time: now,
        text: trimmed,
      },
    ]);
    setInput("");
  };

  const onAction = (key: string) => {
    Alert.alert(t("auth.comingSoon"));
  };

  const appendChatImage = useCallback((uri: string) => {
    const now = new Date().toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `img-${Date.now()}`,
        role: "user",
        kind: "image",
        time: now,
        imageUri: uri,
      },
    ]);
  }, []);

  const onPhotoFromLibrary = useCallback(async () => {
    try {
      const ok = await ensureMediaLibraryPermission(t);
      if (!ok) return;

      Keyboard.dismiss();
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      const result = await launchImageLibrary();

      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) return;
      appendChatImage(uri);
    } catch (e) {
      if (__DEV__) {
        console.error("[meal-description] library error", e);
      }
      Alert.alert(t("auth.errorTitle"), t("auth.errorGeneric"));
    }
  }, [appendChatImage, t]);

  const onPhotoFromCamera = useCallback(async () => {
    if (!Device.isDevice) {
      Alert.alert(
        t("nutritionMeal.cameraSimulatorTitle"),
        t("nutritionMeal.cameraSimulatorMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("nutritionMeal.pickFromLibrary"),
            onPress: () => {
              void onPhotoFromLibrary();
            },
          },
        ],
      );
      return;
    }
    try {
      const ok = await ensureCameraPermission(t);
      if (!ok) return;

      Keyboard.dismiss();
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      const result = await launchCameraForMeal();

      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) return;
      appendChatImage(uri);
    } catch (e) {
      if (__DEV__) {
        console.error("[meal-description] camera error", e);
      }
      Alert.alert(t("auth.errorTitle"), t("auth.errorGeneric"));
    }
  }, [appendChatImage, onPhotoFromLibrary, t]);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-1">
            <AppHeader variant="inner" title={t("nutritionMeal.chatTitle")} />

            <ScrollView
              ref={scrollRef}
              className="flex-1 px-6 pt-6"
              contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View className="gap-8">
              {messages.map((m) => {
                if (m.kind === "image") {
                  return (
                    <View key={m.id} className="max-w-[85%] items-end gap-2 self-end">
                      <View className="overflow-hidden rounded-lg border-4 border-surface-container-lowest shadow-sm">
                        {m.imageUri ? (
                          <Image
                            source={{ uri: m.imageUri }}
                            className="h-56 w-56"
                            resizeMode="cover"
                            accessibilityLabel={t("nutritionMeal.chatAddPhoto")}
                          />
                        ) : (
                          <View className="h-56 w-56 items-center justify-center bg-surface-container">
                            <MaterialCommunityIcons name="food" size={48} color="#767777" />
                          </View>
                        )}
                      </View>
                      <Text className={bubbleTimeClass("user")}>{m.time}</Text>
                    </View>
                  );
                }

                const isAi = m.role === "assistant";
                return (
                  <View
                    key={m.id}
                    className={`max-w-[85%] gap-2 ${isAi ? "items-start self-start" : "items-end self-end"}`}
                  >
                    <View
                      className={`px-5 py-4 shadow-ambient ${
                        isAi
                          ? "rounded-3xl rounded-tl-sm bg-surface-container-lowest"
                          : "rounded-3xl rounded-tr-sm bg-primary-container/30"
                      }`}
                    >
                      {m.text ? (
                        <Text
                          className={`leading-relaxed ${isAi ? "text-on-surface" : "text-on-primary-container"}`}
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {m.text}
                        </Text>
                      ) : null}
                      {isAi && m.actions?.length ? (
                        <View className="mt-4 flex-row flex-wrap gap-2">
                          {m.actions.map((a) => (
                            <Pressable
                              key={a.key}
                              onPress={() => onAction(a.key)}
                              className={`rounded-full px-4 py-2 active:opacity-80 ${
                                a.key === "log"
                                  ? "bg-primary-fixed"
                                  : "bg-surface-container-low"
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold uppercase tracking-tight ${
                                  a.key === "log" ? "text-on-primary-fixed" : "text-on-surface-variant"
                                }`}
                                style={{ fontFamily: "Inter_600SemiBold" }}
                              >
                                {t(a.labelKey)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <Text className={bubbleTimeClass(m.role)}>{m.time}</Text>
                  </View>
                );
              })}
            </View>
            </ScrollView>

            {/* Yüzen giriş çubuğu */}
            <View
              className="border-t border-surface-container/60 bg-surface px-4 pt-2"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
            <View className="flex-row items-center gap-2 rounded-full border border-white/20 bg-surface-container-lowest/95 p-2 shadow-ambient">
              <Pressable
                onPress={onPhotoFromCamera}
                className="h-12 w-12 items-center justify-center rounded-full active:bg-surface-container-low"
                accessibilityRole="button"
                accessibilityLabel={t("nutritionMeal.chatAddPhoto")}
              >
                <MaterialCommunityIcons name="camera-plus-outline" size={24} color="#5a5c5c" />
              </Pressable>
              <Pressable
                onPress={onPhotoFromLibrary}
                className="h-12 w-12 items-center justify-center rounded-full active:bg-surface-container-low"
                accessibilityRole="button"
                accessibilityLabel={t("nutritionMeal.chatPickFromLibrary")}
              >
                <MaterialCommunityIcons name="image-multiple-outline" size={24} color="#5a5c5c" />
              </Pressable>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={t("nutritionMeal.chatInputPlaceholder")}
                placeholderTextColor="#767777"
                className="min-h-[44px] flex-1 px-2 text-base text-on-surface"
                style={{ fontFamily: "Inter_400Regular" }}
                returnKeyType="send"
                onSubmitEditing={send}
              />
              <Pressable
                onPress={send}
                className="h-12 w-12 items-center justify-center rounded-full bg-primary-fixed shadow-lg active:scale-95"
                style={{ shadowColor: "#cafd00", shadowOpacity: 0.25, shadowRadius: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("nutritionMeal.chatSend")}
              >
                <MaterialCommunityIcons name="send" size={22} color="#3a4a00" />
              </Pressable>
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaWrapper>
    </View>
  );
}
