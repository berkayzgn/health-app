import type { MedicalConditionDTO } from "../services/catalogService";

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

export function parseHealthConditionsFromProfile(types: string[] | undefined): {
  selected: Set<string>;
} {
  const selected = new Set<string>();
  for (const raw of types ?? []) {
    if (raw === "none" || raw.startsWith("other:")) continue;
    selected.add(raw);
  }
  return { selected };
}

export function buildHealthConditionTypesPayload(selected: Set<string>): string[] {
  return [...selected];
}
