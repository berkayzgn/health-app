import type { MacroPlanDTO, MedicalConditionDTO } from "../services/catalogService";

export function getConditionLabel(
  code: string,
  lang: string,
  catalog: MedicalConditionDTO[],
): string {
  if (code.startsWith("other:")) return code.slice(6);
  const item = catalog.find((c) => c.code === code);
  if (item) return item.displayNames[lang] ?? item.displayNames.en ?? code;
  return code;
}

export function formatConditionTypesSummary(
  types: string[] | undefined,
  lang: string,
  catalog: MedicalConditionDTO[],
): string {
  if (!types?.length) return "";
  const filtered = types.filter((id) => id !== "none");
  if (!filtered.length) return "";
  return filtered.map((id) => getConditionLabel(id, lang, catalog)).join(", ");
}

export function pickPrimaryMacroPlanCode(
  selectedDietTypeCode: string | null | undefined,
  dietaryPreferences: string[] | undefined,
  macroPlanCodes: Set<string>,
): string | undefined {
  if (selectedDietTypeCode && macroPlanCodes.has(selectedDietTypeCode)) {
    return selectedDietTypeCode;
  }
  return (dietaryPreferences ?? []).find((c) => macroPlanCodes.has(c));
}

/** Makro plan + profil kodu: tek satır özet (önce seçili plan kodu). */
export function formatDietPlanRowSummary(
  selectedDietTypeCode: string | null | undefined,
  dietaryPreferences: string[] | undefined,
  lang: string,
  macroPlanCatalog: MacroPlanDTO[],
): string {
  const macroCodes = new Set(macroPlanCatalog.map((m) => m.code));
  const primary = pickPrimaryMacroPlanCode(
    selectedDietTypeCode,
    dietaryPreferences,
    macroCodes,
  );
  if (!primary) return "";
  const item = macroPlanCatalog.find((d) => d.code === primary);
  return item
    ? (item.displayNames[lang] ?? item.displayNames.en ?? primary)
    : primary;
}

/**
 * Profil formu: conditionTypes + dietaryPreferences ayırır.
 * Diyet tarafında yalnızca makro plan kodları (balanced, high_protein, …) kullanılır;
 * eski kısıtlama kodları (vegan, gluten_free, …) listede gösterilmez ve tercihlerden düşer.
 */
export function splitProfileHealthSelections(
  conditionTypes: string[] | undefined,
  dietaryPreferences: string[] | undefined,
  medicalCatalogCodes: Set<string>,
  macroPlanCodes: Set<string>,
): { selectedConditions: Set<string>; selectedMacroPlanCodes: Set<string>; customTags: string[] } {
  const selectedConditions = new Set<string>();
  const selectedMacroPlanCodes = new Set<string>();
  for (const code of dietaryPreferences ?? []) {
    if (macroPlanCodes.has(code)) selectedMacroPlanCodes.add(code);
  }
  const customTags: string[] = [];
  for (const raw of conditionTypes ?? []) {
    if (raw === "none") continue;
    if (raw.startsWith("other:")) {
      customTags.push(raw.slice(6));
      continue;
    }
    if (medicalCatalogCodes.has(raw)) selectedConditions.add(raw);
    else if (macroPlanCodes.has(raw)) selectedMacroPlanCodes.add(raw);
    // Eski / bilinmeyen kodlar (eski seed diabetes vb.) yok sayılır — yalnızca katalog (abc) kodları.
  }
  return { selectedConditions, selectedMacroPlanCodes, customTags };
}

export function parseHealthConditionsFromProfile(types: string[] | undefined): {
  selected: Set<string>;
  customTags: string[];
} {
  const selected = new Set<string>();
  const customTags: string[] = [];
  for (const raw of types ?? []) {
    if (raw === "none") continue;
    if (raw.startsWith("other:")) customTags.push(raw.slice(6));
    else selected.add(raw);
  }
  return { selected, customTags };
}

export function buildHealthConditionTypesPayload(
  selected: Set<string>,
  customTags: string[],
): string[] {
  const cond: string[] = [...selected];
  customTags.forEach((c) => cond.push(`other:${c}`));
  return cond;
}
