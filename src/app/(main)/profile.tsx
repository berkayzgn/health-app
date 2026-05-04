import { useState, useCallback, useMemo, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import MultiSelectSheet from "../../components/MultiSelectSheet";
import { useStore } from "../../store/useStore";
import * as authService from "../../services/authService";
import { ApiError } from "../../services/api";
import {
  buildHealthConditionTypesPayload,
  parseHealthConditionsFromProfile,
} from "../../utils/conditionTypesDisplay";
import { splitRegisteredFullName } from "../../utils/splitRegisteredFullName";

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

const NAME_PLACEHOLDER = "—";

function nameDraftParts(fullName: string | undefined | null): { given: string; family: string } {
  const { givenName, familyName } = splitRegisteredFullName(fullName?.trim() || null);
  return {
    given: givenName === NAME_PLACEHOLDER ? "" : givenName,
    family: familyName === NAME_PLACEHOLDER ? "" : familyName,
  };
}

/** Sunucunun tek `name` alanı — boş iki alan için boş dize dönmez, validasyon gerektirir */
function composeProfileFullName(given: string, family: string): string {
  const g = given.trim().replace(/\s+/g, " ");
  const f = family.trim().replace(/\s+/g, " ");
  if (!g && !f) return "";
  if (!g) return f;
  if (!f) return g;
  return `${g} ${f}`;
}

function normalizeNameForCompare(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const authUser = useStore((s) => s.authUser);
  const userProfile = useStore((s) => s.userProfile);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const theme = useStore((s) => s.theme);
  const medicalConditions = useStore((s) => s.medicalConditions);
  const medicalConditionsLoaded = useStore((s) => s.medicalConditionsLoaded);
  const loadMedicalConditions = useStore((s) => s.loadMedicalConditions);

  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [emailDraft, setEmailDraft] = useState("");
  const [givenNameDraft, setGivenNameDraft] = useState("");
  const [familyNameDraft, setFamilyNameDraft] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [diseaseSheetOpen, setDiseaseSheetOpen] = useState(false);
  const [allergySheetOpen, setAllergySheetOpen] = useState(false);

  useEffect(() => {
    if (!medicalConditionsLoaded) loadMedicalConditions();
  }, [medicalConditionsLoaded, loadMedicalConditions]);

  useLayoutEffect(() => {
    setEmailDraft(userProfile?.email?.trim() || authUser?.email?.trim() || "");
    const registered = userProfile?.name?.trim() || authUser?.name?.trim() || "";
    const parts = nameDraftParts(registered);
    setGivenNameDraft(parts.given);
    setFamilyNameDraft(parts.family);
  }, [userProfile?.email, authUser?.email, userProfile?.name, authUser?.name]);

  useFocusEffect(
    useCallback(() => {
      setEmailDraft(userProfile?.email?.trim() || authUser?.email?.trim() || "");
      const registered = userProfile?.name?.trim() || authUser?.name?.trim() || "";
      const parts = nameDraftParts(registered);
      setGivenNameDraft(parts.given);
      setFamilyNameDraft(parts.family);
      if (!userProfile || !medicalConditionsLoaded) return;
      const { selected } = parseHealthConditionsFromProfile(userProfile.conditionTypes);
      setSelectedConditions(selected);
    }, [userProfile, authUser, medicalConditionsLoaded]),
  );

  const registeredFullName = userProfile?.name?.trim() || authUser?.name?.trim() || "";

  const baselineEmailNormalized = (
    userProfile?.email?.trim() ||
    authUser?.email?.trim() ||
    ""
  ).toLowerCase();

  const savedConditionSet = useMemo(() => {
    if (!userProfile || !medicalConditionsLoaded) return null;
    return parseHealthConditionsFromProfile(userProfile.conditionTypes).selected;
  }, [userProfile, medicalConditionsLoaded]);

  const isDirty = useMemo(() => {
    const draftEmailNorm = emailDraft.trim().toLowerCase();
    const emailChanged = draftEmailNorm !== baselineEmailNormalized;
    const nameChanged =
      normalizeNameForCompare(composeProfileFullName(givenNameDraft, familyNameDraft)) !==
      normalizeNameForCompare(registeredFullName);
    if (!savedConditionSet) return emailChanged || nameChanged;
    return emailChanged || nameChanged || !setsEqual(selectedConditions, savedConditionSet);
  }, [
    emailDraft,
    baselineEmailNormalized,
    givenNameDraft,
    familyNameDraft,
    registeredFullName,
    selectedConditions,
    savedConditionSet,
  ]);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  /** Nest ValidationPipe forbidNonWhitelisted: eski API sürümü email alanını tanımaz. */
  function isEmailPropertyWhitelistError(message: string) {
    const m = message.toLowerCase();
    return (
      m.includes("property email should not exist") ||
      m.includes("email should not exist") ||
      (m.includes("whitelist") && m.includes("property") && m.includes("email"))
    );
  }

  const toggleCondition = useCallback((code: string) => {
    setSelectedConditions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const diseaseCatalog = useMemo(
    () => medicalConditions.filter((c) => c.kind === "disease"),
    [medicalConditions],
  );
  const allergyCatalog = useMemo(
    () => medicalConditions.filter((c) => c.kind === "allergy"),
    [medicalConditions],
  );

  const diseaseSummary = useMemo(() => {
    return diseaseCatalog
      .filter((mc) => selectedConditions.has(mc.code))
      .map((mc) => mc.displayNames[lang] ?? mc.displayNames.en ?? mc.code)
      .join(", ");
  }, [diseaseCatalog, selectedConditions, lang]);

  const allergySummary = useMemo(() => {
    return allergyCatalog
      .filter((mc) => selectedConditions.has(mc.code))
      .map((mc) => mc.displayNames[lang] ?? mc.displayNames.en ?? mc.code)
      .join(", ");
  }, [allergyCatalog, selectedConditions, lang]);

  const selectedDiseaseCount = useMemo(
    () => diseaseCatalog.filter((c) => selectedConditions.has(c.code)).length,
    [diseaseCatalog, selectedConditions],
  );
  const selectedAllergyCount = useMemo(
    () => allergyCatalog.filter((c) => selectedConditions.has(c.code)).length,
    [allergyCatalog, selectedConditions],
  );

  const onSave = async () => {
    if (saving) return;
    if (selectedConditions.size === 0) {
      Alert.alert(
        t("onboarding.requiredConditionsTitle"),
        t("onboarding.requiredConditionsMessage"),
      );
      return;
    }
    const nameCombined = composeProfileFullName(givenNameDraft, familyNameDraft).trim();
    if (!nameCombined) {
      Alert.alert(t("auth.errorTitle"), t("profile.nameRequired"));
      return;
    }
    const emailTrim = emailDraft.trim();
    if (!isValidEmail(emailTrim)) {
      Alert.alert(t("auth.errorTitle"), t("profile.invalidEmail"));
      return;
    }

    setSaving(true);
    try {
      const conditionTypes = buildHealthConditionTypesPayload(selectedConditions);
      await authService.updateProfile({
        name: nameCombined,
        email: emailTrim,
        conditionTypes,
      });
      await refreshProfile();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        Alert.alert(t("auth.errorTitle"), t("auth.errors.emailInUse"));
        return;
      }
      const raw = e instanceof Error ? e.message : "";
      if (e instanceof ApiError && raw && isEmailPropertyWhitelistError(raw)) {
        Alert.alert(t("auth.errorTitle"), t("profile.saveRejectedEmailWhitelist"));
        return;
      }
      const msg = e instanceof Error ? e.message : t("onboarding.errorSave");
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setSaving(false);
    }
  };

  const bottomPad = 24 + Math.max(insets.bottom, 12);
  const catalogLoading = !medicalConditionsLoaded;
  const onPrimaryFixed = "#3a4a00";

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#4e6300" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      <MultiSelectSheet
        visible={diseaseSheetOpen}
        title={t("onboarding.diseasesSheetTitle")}
        hint={t("onboarding.diseasesSheetHint")}
        items={diseaseCatalog}
        selected={selectedConditions}
        lang={lang}
        onToggle={toggleCondition}
        onClose={() => setDiseaseSheetOpen(false)}
      />
      <MultiSelectSheet
        visible={allergySheetOpen}
        title={t("onboarding.allergiesSheetTitle")}
        hint={t("onboarding.allergiesSheetHint")}
        items={allergyCatalog}
        selected={selectedConditions}
        lang={lang}
        onToggle={toggleCondition}
        onClose={() => setAllergySheetOpen(false)}
      />

      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View className="flex-1">
            <AppHeader variant="inner" title={t("layout.headerProfile")} />

            <ScrollView
              className="flex-1"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              alwaysBounceVertical={false}
              overScrollMode="never"
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: bottomPad + (isDirty || saving ? 12 : 0),
                maxWidth: 960,
                width: "100%",
                alignSelf: "center",
                flexGrow: 0,
              }}
            >
              <Text
                className="mb-6 text-base leading-relaxed text-on-surface-variant"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {t("profile.editScreenIntro")}
              </Text>

              <View className="relative mb-8 overflow-hidden rounded-[1rem] bg-surface-container-lowest p-8 shadow-ambient">
                <View
                  className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-fixed/10"
                  pointerEvents="none"
                />
                <View className="relative z-10 gap-5">
                  <Text
                    className="text-outline text-[11px] font-bold uppercase tracking-wider"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t("profile.profileCardTitle")}
                  </Text>

                  <View className="flex-row gap-3">
                    <View className="flex-1 min-w-0">
                      <Text
                        className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("profile.givenNameLabel")}
                      </Text>
                      <TextInput
                        value={givenNameDraft}
                        onChangeText={setGivenNameDraft}
                        autoCapitalize="words"
                        editable={!saving}
                        placeholderTextColor="#767777"
                        className="rounded-xl border border-outline-variant/35 bg-surface-container-low text-on-surface"
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 16,
                          lineHeight: 24,
                          minHeight: 52,
                          paddingHorizontal: 12,
                          paddingVertical: 13,
                          ...(Platform.OS === "android"
                            ? { textAlignVertical: "center" as const, includeFontPadding: false }
                            : {}),
                        }}
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text
                        className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {t("profile.familyNameLabel")}
                      </Text>
                      <TextInput
                        value={familyNameDraft}
                        onChangeText={setFamilyNameDraft}
                        autoCapitalize="words"
                        editable={!saving}
                        placeholderTextColor="#767777"
                        className="rounded-xl border border-outline-variant/35 bg-surface-container-low text-on-surface"
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 16,
                          lineHeight: 24,
                          minHeight: 52,
                          paddingHorizontal: 12,
                          paddingVertical: 13,
                          ...(Platform.OS === "android"
                            ? { textAlignVertical: "center" as const, includeFontPadding: false }
                            : {}),
                        }}
                      />
                    </View>
                  </View>

                  <View className="h-px bg-outline-variant/20" />

                  <View>
                    <Text
                      className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("profile.emailField")}
                    </Text>
                    <TextInput
                      value={emailDraft}
                      onChangeText={setEmailDraft}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!saving}
                      placeholderTextColor="#767777"
                      className="rounded-xl border border-outline-variant/40 bg-surface-container-low text-on-surface"
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 16,
                        lineHeight: 24,
                        minHeight: 52,
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        ...(Platform.OS === "android"
                          ? { textAlignVertical: "center" as const, includeFontPadding: false }
                          : {}),
                      }}
                    />
                  </View>
                </View>
              </View>

              <View className="bg-surface-container-low rounded-[1rem] p-8 mb-8">
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1 pr-3">
                    <Text className="font-headline text-xl font-bold text-on-surface">
                      {t("profile.healthIdentity")}
                    </Text>
                    <Text
                      className="text-sm text-on-surface-variant mt-2 leading-relaxed"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {t("profile.editHealthSubtitle")}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="shield-check" size={24} color="#767777" />
                </View>

                <View className="gap-6 mt-4">
                  <Text
                    className="text-base text-on-surface"
                    style={{ fontFamily: "Manrope_700Bold" }}
                  >
                    {t("profile.conditionSectionTitle")}
                  </Text>

                  {catalogLoading ? (
                    <ActivityIndicator size="small" color="#4e6300" />
                  ) : (
                    <View className="gap-5">
                      <View>
                        <Text
                          className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("onboarding.diseasesLabel")}
                        </Text>
                        <Pressable
                          onPress={() => setDiseaseSheetOpen(true)}
                          disabled={saving}
                          className="flex-row items-center rounded-card border border-outline-variant/30 bg-surface-container-lowest px-5 py-4 active:bg-surface-container"
                          style={{ opacity: saving ? 0.65 : 1 }}
                        >
                          <MaterialIcons name="medical-services" size={20} color="#767777" />
                          <Text
                            className={`ml-3 flex-1 text-[15px] ${
                              selectedDiseaseCount > 0 ? "text-on-surface" : "text-outline"
                            }`}
                            style={{ fontFamily: "Inter_500Medium" }}
                            numberOfLines={3}
                          >
                            {selectedDiseaseCount > 0
                              ? diseaseSummary
                              : t("onboarding.diseasesPlaceholder")}
                          </Text>
                          {selectedDiseaseCount > 0 && (
                            <View className="mr-2 rounded-full bg-primary-fixed px-2.5 py-0.5">
                              <Text
                                className="text-[11px] font-bold text-on-primary-fixed"
                                style={{ fontFamily: "Inter_600SemiBold" }}
                              >
                                {selectedDiseaseCount}
                              </Text>
                            </View>
                          )}
                          <MaterialIcons name="expand-more" size={22} color="#767777" />
                        </Pressable>
                      </View>

                      <View>
                        <Text
                          className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t("onboarding.allergiesLabel")}
                        </Text>
                        <Pressable
                          onPress={() => setAllergySheetOpen(true)}
                          disabled={saving}
                          className="flex-row items-center rounded-card border border-outline-variant/30 bg-surface-container-lowest px-5 py-4 active:bg-surface-container"
                          style={{ opacity: saving ? 0.65 : 1 }}
                        >
                          <MaterialIcons name="warning-amber" size={20} color="#767777" />
                          <Text
                            className={`ml-3 flex-1 text-[15px] ${
                              selectedAllergyCount > 0 ? "text-on-surface" : "text-outline"
                            }`}
                            style={{ fontFamily: "Inter_500Medium" }}
                            numberOfLines={3}
                          >
                            {selectedAllergyCount > 0
                              ? allergySummary
                              : t("onboarding.allergiesPlaceholder")}
                          </Text>
                          {selectedAllergyCount > 0 && (
                            <View className="mr-2 rounded-full bg-primary-fixed px-2.5 py-0.5">
                              <Text
                                className="text-[11px] font-bold text-on-primary-fixed"
                                style={{ fontFamily: "Inter_600SemiBold" }}
                              >
                                {selectedAllergyCount}
                              </Text>
                            </View>
                          )}
                          <MaterialIcons name="expand-more" size={22} color="#767777" />
                        </Pressable>
                      </View>

                      {selectedConditions.size > 0 && (
                        <View className="flex-row flex-wrap gap-2">
                          {medicalConditions
                            .filter((mc) => selectedConditions.has(mc.code))
                            .map((mc) => (
                              <Pressable
                                key={mc.code}
                                onPress={() => toggleCondition(mc.code)}
                                disabled={saving}
                                className="flex-row items-center gap-1.5 rounded-pill bg-primary-fixed px-4 py-2"
                                style={{ opacity: saving ? 0.65 : 1 }}
                              >
                                <Text
                                  className="text-xs font-medium text-on-primary-fixed"
                                  style={{ fontFamily: "Inter_500Medium" }}
                                >
                                  {mc.displayNames[lang] ?? mc.displayNames.en ?? mc.code}
                                </Text>
                                <MaterialIcons name="close" size={14} color={onPrimaryFixed} />
                              </Pressable>
                            ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {(isDirty || saving) && (
              <View
                className="border-t border-surface-container bg-surface px-6 pt-4"
                style={{ paddingBottom: bottomPad }}
              >
                <Pressable
                  onPress={onSave}
                  disabled={saving}
                  className="h-14 flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed active:opacity-90"
                  style={{ opacity: saving ? 0.5 : 1 }}
                >
                  {saving ? (
                    <ActivityIndicator color="#3a4a00" />
                  ) : (
                    <>
                      <Text
                        className="text-base font-bold text-on-primary-fixed"
                        style={{ fontFamily: "Manrope_700Bold" }}
                      >
                        {t("profile.saveChanges")}
                      </Text>
                      <MaterialIcons name="check" size={22} color="#3a4a00" />
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaWrapper>
    </View>
  );
}
