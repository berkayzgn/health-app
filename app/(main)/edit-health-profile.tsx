import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaWrapper from "../../components/SafeAreaWrapper";
import AppHeader from "../../components/AppHeader";
import MultiSelectSheet from "../../components/MultiSelectSheet";
import { useStore } from "../../store/useStore";
import * as authService from "../../services/authService";
import {
  buildHealthConditionTypesPayload,
  pickPrimaryMacroPlanCode,
  splitProfileHealthSelections,
} from "../../utils/conditionTypesDisplay";

export default function EditHealthProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const userProfile = useStore((s) => s.userProfile);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const theme = useStore((s) => s.theme);
  const medicalConditions = useStore((s) => s.medicalConditions);
  const medicalConditionsLoaded = useStore((s) => s.medicalConditionsLoaded);
  const loadMedicalConditions = useStore((s) => s.loadMedicalConditions);
  const macroPlans = useStore((s) => s.macroPlans);
  const macroPlansLoaded = useStore((s) => s.macroPlansLoaded);
  const loadMacroPlans = useStore((s) => s.loadMacroPlans);

  const lang = i18n.language?.startsWith("tr") ? "tr" : "en";

  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(() => new Set());
  const [selectedDiets, setSelectedDiets] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [diseaseSheetOpen, setDiseaseSheetOpen] = useState(false);
  const [allergySheetOpen, setAllergySheetOpen] = useState(false);
  const [dietSheetOpen, setDietSheetOpen] = useState(false);

  const medicalCodeSet = useMemo(
    () => new Set(medicalConditions.map((c) => c.code)),
    [medicalConditions],
  );
  const macroPlanCodeSet = useMemo(
    () => new Set(macroPlans.map((d) => d.code)),
    [macroPlans],
  );

  useEffect(() => {
    if (!medicalConditionsLoaded) loadMedicalConditions();
    if (!macroPlansLoaded) loadMacroPlans();
  }, [medicalConditionsLoaded, loadMedicalConditions, macroPlansLoaded, loadMacroPlans]);

  useFocusEffect(
    useCallback(() => {
      if (!userProfile || !medicalConditionsLoaded || !macroPlansLoaded) return;
      setHeight(String(userProfile.heightCm ?? "").trim());
      setWeight(String(userProfile.weightKg ?? "").trim());
      setGender(
        userProfile.gender === "male" || userProfile.gender === "female"
          ? userProfile.gender
          : "",
      );
      const { selectedConditions: sc, selectedMacroPlanCodes: sm } =
        splitProfileHealthSelections(
          userProfile.conditionTypes,
          userProfile.dietaryPreferences,
          medicalCodeSet,
          macroPlanCodeSet,
        );
      setSelectedConditions(sc);
      const primary = pickPrimaryMacroPlanCode(
        userProfile.selectedDietTypeCode,
        userProfile.dietaryPreferences,
        macroPlanCodeSet,
      );
      const fromSplit = [...sm][0];
      const code = primary ?? fromSplit;
      setSelectedDiets(code ? new Set([code]) : new Set());
    }, [
      userProfile,
      medicalConditionsLoaded,
      macroPlansLoaded,
      medicalCodeSet,
      macroPlanCodeSet,
    ]),
  );

  const metricsRow = width >= 720;

  const toggleCondition = useCallback((code: string) => {
    setSelectedConditions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const toggleMacroPlan = useCallback((code: string) => {
    setSelectedDiets((prev) => {
      if (prev.has(code)) return new Set();
      return new Set([code]);
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

  const macroPlanSummary = useMemo(() => {
    if (selectedDiets.size === 0) return "";
    return macroPlans
      .filter((dt) => selectedDiets.has(dt.code))
      .map((dt) => dt.displayNames[lang] ?? dt.displayNames.en ?? dt.code)
      .join(", ");
  }, [selectedDiets, macroPlans, lang]);

  const canSave = useMemo(() => {
    const h = parseFloat(height.replace(",", "."));
    const w = parseFloat(weight.replace(",", "."));
    return (
      (gender === "male" || gender === "female") &&
      Number.isFinite(h) &&
      h > 0 &&
      Number.isFinite(w) &&
      w > 0
    );
  }, [height, weight, gender]);

  const onSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const conditionTypes = buildHealthConditionTypesPayload(selectedConditions, []);
      const macroCode = [...selectedDiets][0];
      const dietaryPreferences = macroCode ? [macroCode] : [];
      await authService.updateProfile({
        gender,
        heightCm: height.trim(),
        weightKg: weight.trim(),
        conditionTypes,
        dietaryPreferences,
        selectedDietTypeCode: macroCode ?? null,
      });
      await refreshProfile();
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("onboarding.errorSave");
      Alert.alert(t("auth.errorTitle"), msg);
    } finally {
      setSaving(false);
    }
  };

  const bottomPad = 24 + Math.max(insets.bottom, 12);
  const catalogLoading = !medicalConditionsLoaded || !macroPlansLoaded;
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

      <MultiSelectSheet
        visible={dietSheetOpen}
        title={t("onboarding.macroPlanSheetTitle")}
        hint={t("onboarding.macroPlanSheetHint")}
        items={macroPlans}
        selected={selectedDiets}
        lang={lang}
        onToggle={toggleMacroPlan}
        onClose={() => setDietSheetOpen(false)}
      />

      <SafeAreaWrapper className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1">
          <AppHeader variant="inner" title={t("profile.editHealthTitle")} />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: bottomPad + 88,
              maxWidth: 960,
              width: "100%",
              alignSelf: "center",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              className="mb-8 text-base leading-relaxed text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {t("profile.editHealthSubtitle")}
            </Text>

            <View
              className="mb-10 gap-4"
              style={{ flexDirection: metricsRow ? "row" : "column" }}
            >
              {(
                [
                  {
                    key: "w",
                    label: t("onboarding.weight"),
                    value: weight,
                    set: setWeight,
                    suffix: t("onboarding.kg"),
                    ph: "72",
                    keyboard: "decimal-pad" as const,
                  },
                  {
                    key: "h",
                    label: t("onboarding.height"),
                    value: height,
                    set: setHeight,
                    suffix: t("onboarding.cm"),
                    ph: "182",
                    keyboard: "decimal-pad" as const,
                  },
                ] as const
              ).map((field) => (
                <View
                  key={field.key}
                  className="rounded-card bg-surface-container-low p-6"
                  style={{ flex: metricsRow ? 1 : undefined }}
                >
                  <Text
                    className="mb-4 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {field.label}
                  </Text>
                  <View className="flex-row items-baseline gap-1">
                    <TextInput
                      value={field.value}
                      onChangeText={field.set}
                      placeholder={field.ph}
                      keyboardType={field.keyboard}
                      className="min-h-[40px] flex-1 text-3xl text-on-surface"
                      style={{ fontFamily: "Manrope_700Bold" }}
                      placeholderTextColor="#dbdddd"
                    />
                    <Text
                      className="text-sm font-medium text-outline"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      {field.suffix}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="mb-10">
              <Text
                className="mb-4 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {t("onboarding.genderLabel")}
              </Text>
              <View className="flex-row gap-3">
                {(["male", "female"] as const).map((g) => {
                  const on = gender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setGender(g)}
                      className={`flex-1 rounded-card border px-5 py-4 active:opacity-90 ${
                        on
                          ? "border-primary-fixed bg-primary-fixed/15"
                          : "border-outline-variant/30 bg-surface-container-low"
                      }`}
                    >
                      <Text
                        className={`text-center text-base font-bold ${
                          on ? "text-on-surface" : "text-on-surface-variant"
                        }`}
                        style={{ fontFamily: "Manrope_700Bold" }}
                      >
                        {g === "male" ? t("onboarding.genderMale") : t("onboarding.genderFemale")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mb-6 gap-6">
              <Text
                className="text-lg text-on-surface"
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
                      className="flex-row items-center rounded-card border border-outline-variant/30 bg-surface-container-low px-5 py-4 active:bg-surface-container"
                    >
                      <MaterialIcons name="medical-services" size={20} color="#767777" />
                      <Text
                        className={`ml-3 flex-1 text-[15px] ${
                          selectedDiseaseCount > 0 ? "text-on-surface" : "text-outline"
                        }`}
                        style={{ fontFamily: "Inter_500Medium" }}
                        numberOfLines={2}
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
                      className="flex-row items-center rounded-card border border-outline-variant/30 bg-surface-container-low px-5 py-4 active:bg-surface-container"
                    >
                      <MaterialIcons name="warning-amber" size={20} color="#767777" />
                      <Text
                        className={`ml-3 flex-1 text-[15px] ${
                          selectedAllergyCount > 0 ? "text-on-surface" : "text-outline"
                        }`}
                        style={{ fontFamily: "Inter_500Medium" }}
                        numberOfLines={2}
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
                            className="flex-row items-center gap-1.5 rounded-pill bg-primary-fixed px-4 py-2"
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

                  <View>
                    <Text
                      className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-outline"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {t("onboarding.macroPlanLabel")}
                    </Text>
                    <Pressable
                      onPress={() => setDietSheetOpen(true)}
                      className="flex-row items-center rounded-card border border-outline-variant/30 bg-surface-container-low px-5 py-4 active:bg-surface-container"
                    >
                      <MaterialIcons name="restaurant" size={20} color="#767777" />
                      <Text
                        className={`ml-3 flex-1 text-[15px] ${
                          selectedDiets.size > 0 ? "text-on-surface" : "text-outline"
                        }`}
                        style={{ fontFamily: "Inter_500Medium" }}
                        numberOfLines={2}
                      >
                        {selectedDiets.size > 0 ? macroPlanSummary : t("onboarding.macroPlanPlaceholder")}
                      </Text>
                      {selectedDiets.size > 0 && (
                        <View className="mr-2 rounded-full bg-primary-fixed px-2.5 py-0.5">
                          <Text
                            className="text-[11px] font-bold text-on-primary-fixed"
                            style={{ fontFamily: "Inter_600SemiBold" }}
                          >
                            {selectedDiets.size}
                          </Text>
                        </View>
                      )}
                      <MaterialIcons name="expand-more" size={22} color="#767777" />
                    </Pressable>
                    {selectedDiets.size > 0 && (
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        {macroPlans
                          .filter((dt) => selectedDiets.has(dt.code))
                          .map((dt) => (
                            <Pressable
                              key={dt.code}
                              onPress={() => toggleMacroPlan(dt.code)}
                              className="flex-row items-center gap-1.5 rounded-pill bg-primary-fixed px-4 py-2"
                            >
                              <Text
                                className="text-xs font-medium text-on-primary-fixed"
                                style={{ fontFamily: "Inter_500Medium" }}
                              >
                                {dt.displayNames[lang] ?? dt.displayNames.en ?? dt.code}
                              </Text>
                              <MaterialIcons name="close" size={14} color={onPrimaryFixed} />
                            </Pressable>
                          ))}
                      </View>
                    )}
                  </View>

                </View>
              )}
            </View>
          </ScrollView>

          <View
            className="border-t border-surface-container bg-surface px-6 pt-4"
            style={{ paddingBottom: bottomPad }}
          >
            <Pressable
              onPress={onSave}
              disabled={!canSave || saving}
              className="h-14 flex-row items-center justify-center gap-2 rounded-pill bg-primary-fixed active:opacity-90"
              style={{ opacity: !canSave || saving ? 0.5 : 1 }}
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
        </View>
      </SafeAreaWrapper>
    </View>
  );
}
