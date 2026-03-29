import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  ActivityIndicator,
  Modal,
  FlatList,
  useWindowDimensions,
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
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex } from "../../theme/designRgb";
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
  launchCameraForMeal,
  launchImageLibrary,
} from "../../utils/mediaImagePick";
import {
  analyzeMealImageFromUri,
  createMeal,
  listMeals,
  type MealImageNutrition,
  type MealRecord,
} from "../../services/mealsService";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  time: string;
  text?: string;
  kind: "text" | "image";
  imageUri?: string;
  shortTitle?: string;
  nutrition?: MealImageNutrition;
  /** AI balonunda alt aksiyonlar */
  actions?: { key: string; labelKey: string }[];
};

const MEAL_CHAT_STORAGE_KEY = "@health_app_meal_chat_v1";

function isChatMessage(x: unknown): x is ChatMessage {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const roleOk = o.role === "assistant" || o.role === "user";
  const kindOk = o.kind === "text" || o.kind === "image";
  return typeof o.id === "string" && typeof o.time === "string" && roleOk && kindOk;
}

function bubbleTimeClass(role: ChatRole) {
  return role === "assistant"
    ? "ml-2 self-start text-[10px] font-label font-medium uppercase tracking-wider text-outline"
    : "mr-2 self-end text-[10px] font-label font-medium uppercase tracking-wider text-outline";
}

export default function MealChatScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const mealHistoryPanelWidth = Math.min(340, Math.round(windowWidth * 0.82));
  const mealHistorySafeHeight = Math.max(0, windowHeight - insets.top - insets.bottom);
  /** Tam ekran yerine güvenli alanın ~%68’i — panel daha kısa */
  const mealHistoryPanelHeight = Math.round(mealHistorySafeHeight * 0.68);
  const theme = useStore((s) => s.theme);
  const headerPalette = theme === "dark" ? DARK_RGB : LIGHT_RGB;
  const headerIconColor = rgbTripletToHex(headerPalette["on-primary-fixed"]);
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHydrated, setChatHydrated] = useState(false);
  const [loggingMessageId, setLoggingMessageId] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMeals, setHistoryMeals] = useState<MealRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadMealHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const rows = await listMeals({
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      });
      setHistoryMeals(rows);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : String(e));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (historyOpen) void loadMealHistory();
  }, [historyOpen, loadMealHistory]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(MEAL_CHAT_STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(isChatMessage);
            setMessages(cleaned);
          }
        }
      } catch (e) {
        if (__DEV__) console.warn("[meal-description] hydrate chat", e);
      } finally {
        if (!cancelled) setChatHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chatHydrated) return;
    const handle = setTimeout(() => {
      void AsyncStorage.setItem(MEAL_CHAT_STORAGE_KEY, JSON.stringify(messages));
    }, 250);
    return () => clearTimeout(handle);
  }, [messages, chatHydrated]);

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

  const handleLogMeal = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.shortTitle || !msg.nutrition) return;
      setLoggingMessageId(msg.id);
      try {
        await createMeal({
          name: msg.shortTitle.slice(0, 200),
          source: "manual",
          mealType: "snack",
          calories: msg.nutrition.calories,
          protein: msg.nutrition.protein,
          carbs: msg.nutrition.carbs,
          fat: msg.nutrition.fat,
        });
        setMessages((prev) =>
          prev.map((x) => (x.id === msg.id ? { ...x, actions: undefined } : x)),
        );
        Alert.alert(t("nutritionMeal.mealAddedTitle"), t("nutritionMeal.mealAddedBody"));
        if (historyOpen) void loadMealHistory();
      } catch (e) {
        if (__DEV__) {
          console.warn("[meal-description] createMeal", e);
        }
        Alert.alert(t("auth.errorTitle"), t("nutritionMeal.saveMealError"));
      } finally {
        setLoggingMessageId(null);
      }
    },
    [t, historyOpen, loadMealHistory],
  );

  const appendChatImage = useCallback(
    (uri: string) => {
      const imageId = `img-${Date.now()}`;
      const replyId = `ai-${Date.now() + 1}`;
      const now = new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      const locale = i18n.language?.toLowerCase().startsWith("en") ? "en" : "tr";

      setMessages((prev) => [
        ...prev,
        {
          id: imageId,
          role: "user",
          kind: "image",
          time: now,
          imageUri: uri,
        },
        {
          id: replyId,
          role: "assistant",
          kind: "text",
          time: now,
          text: t("nutritionMeal.analyzingMealImage"),
        },
      ]);

      void analyzeMealImageFromUri(uri, locale)
        .then(({ description, shortTitle, nutrition }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId
                ? {
                    ...m,
                    text: description,
                    shortTitle,
                    nutrition,
                    actions: [{ key: "log", labelKey: "nutritionMeal.chatAddMeal" }],
                  }
                : m,
            ),
          );
        })
        .catch((err: unknown) => {
          if (__DEV__) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn("[meal-description] analyzeMealImageFromUri", msg);
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId
                ? { ...m, text: t("nutritionMeal.mealImageAnalysisFailed") }
                : m,
            ),
          );
        });
    },
    [i18n.language, t],
  );

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
            <AppHeader
              variant="inner"
              title={t("nutritionMeal.chatTitle")}
              right={
                <Pressable
                  hitSlop={12}
                  onPress={() => setHistoryOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t("nutritionMeal.mealHistoryMenu")}
                  className="h-10 w-10 items-center justify-center rounded-full bg-on-primary-fixed/20 active:bg-on-primary-fixed/30"
                >
                  <MaterialCommunityIcons name="menu" size={24} color={headerIconColor} />
                </Pressable>
              }
            />

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
                      {isAi && m.nutrition ? (
                        <View className="mt-3">
                          <Text
                            className="text-xs text-on-surface-variant"
                            style={{ fontFamily: "Inter_400Regular" }}
                          >
                            {t("nutritionMeal.estimatedPortionHint")}
                          </Text>
                          <Text
                            className="mt-1 text-sm text-on-surface-variant"
                            style={{ fontFamily: "Inter_400Regular" }}
                          >
                            <Text className="font-semibold text-on-surface">
                              ≈ {Math.round(m.nutrition.calories)} kcal
                            </Text>
                            {" · "}
                            {t("nutritionMeal.macroLineP", {
                              n: Math.round(m.nutrition.protein * 10) / 10,
                            })}
                            {" · "}
                            {t("nutritionMeal.macroLineC", {
                              n: Math.round(m.nutrition.carbs * 10) / 10,
                            })}
                            {" · "}
                            {t("nutritionMeal.macroLineF", {
                              n: Math.round(m.nutrition.fat * 10) / 10,
                            })}
                          </Text>
                        </View>
                      ) : null}
                      {isAi && m.actions?.length ? (
                        <View className="mt-4 flex-row flex-wrap gap-2">
                          {m.actions.map((a) => (
                            <Pressable
                              key={a.key}
                              onPress={() => {
                                if (a.key === "log") void handleLogMeal(m);
                              }}
                              disabled={loggingMessageId === m.id}
                              className={`min-h-[40px] flex-row items-center justify-center rounded-full px-4 py-2 active:opacity-80 ${
                                a.key === "log"
                                  ? "bg-primary-fixed"
                                  : "bg-surface-container-low"
                              }`}
                            >
                              {loggingMessageId === m.id ? (
                                <ActivityIndicator size="small" color="#3a4a00" />
                              ) : (
                                <Text
                                  className={`text-xs font-bold uppercase tracking-tight ${
                                    a.key === "log" ? "text-on-primary-fixed" : "text-on-surface-variant"
                                  }`}
                                  style={{ fontFamily: "Inter_600SemiBold" }}
                                >
                                  {t(a.labelKey)}
                                </Text>
                              )}
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

      <Modal
        visible={historyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <View className="flex-1 flex-row" style={{ maxHeight: windowHeight }}>
          <Pressable
            className="flex-1 self-stretch bg-black/50"
            onPress={() => setHistoryOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("nutritionMeal.mealHistoryClose")}
          />
          <View
            style={{
              width: mealHistoryPanelWidth,
              height: mealHistoryPanelHeight,
              maxHeight: mealHistoryPanelHeight,
              marginTop: insets.top,
              paddingRight: insets.right,
              alignSelf: "flex-start",
            }}
            className="overflow-hidden rounded-tl-2xl border-l border-outline/20 bg-surface"
          >
            {/* Başlık satırı (px-5 pt-2 pb-3, min-h 40 — biraz daha kompakt) */}
            <View style={{ flex: 1, minHeight: 0 }}>
              <View className="border-b border-surface-container px-5 pt-2 pb-3">
                <View className="min-h-[40px] flex-row items-center justify-between">
                  <Text
                    className="flex-1 pr-2 font-headline text-xl text-on-surface"
                    numberOfLines={1}
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t("nutritionMeal.mealHistoryTitle")}
                  </Text>
                  <Pressable
                    hitSlop={12}
                    onPress={() => setHistoryOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel={t("nutritionMeal.mealHistoryClose")}
                    className="rounded-full p-2 active:bg-surface-container-high"
                  >
                    <MaterialCommunityIcons name="close" size={22} color="#5a5c5c" />
                  </Pressable>
                </View>
              </View>

              {historyLoading ? (
                <View className="flex-1 items-center justify-center py-12">
                  <ActivityIndicator size="large" color="#5a5c5c" />
                </View>
              ) : historyError ? (
                <View className="flex-1 justify-center px-4 py-6">
                  <Text
                    className="text-center text-sm text-on-surface-variant"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {historyError}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={historyMeals}
                  keyExtractor={(item) => item.id}
                  style={{ flex: 1, minHeight: 0 }}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    paddingBottom: Math.max(16, insets.bottom + 8),
                    flexGrow: 1,
                  }}
                  ListEmptyComponent={
                    <Text
                      className="py-8 text-center text-sm text-on-surface-variant"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {t("nutritionMeal.mealHistoryEmpty")}
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const when = new Date(item.date);
                    const dateStr = when.toLocaleString(i18n.language, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const typeKey = `nutritionMeal.mealType.${item.mealType}` as const;
                    const typeLabel = t(typeKey, { defaultValue: item.mealType });
                    return (
                      <View className="mb-3 rounded-2xl border border-surface-container bg-surface-container-lowest/80 px-4 py-3">
                        <Text
                          className="text-base text-on-surface"
                          numberOfLines={2}
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {item.name}
                        </Text>
                        <Text
                          className="mt-1.5 text-xs leading-relaxed text-on-surface-variant"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {dateStr}
                          {" · "}
                          {typeLabel}
                          {" · "}
                          {t("nutritionMeal.mealHistoryKcal", { n: Math.round(item.calories) })}
                        </Text>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
