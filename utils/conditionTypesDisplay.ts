import type { TFunction } from "i18next";

export const HEALTH_CONDITION_IDS = ["diabetes", "hypertension", "asthma"] as const;

const TAG_I18N: Record<(typeof HEALTH_CONDITION_IDS)[number], string> = {
  diabetes: "onboarding.tagDiabetes",
  hypertension: "onboarding.tagHypertension",
  asthma: "onboarding.tagAsthma",
};

export function formatConditionTypeLabel(id: string, t: TFunction): string {
  if (id.startsWith("other:")) return id.slice(6);
  if ((HEALTH_CONDITION_IDS as readonly string[]).includes(id)) {
    return t(TAG_I18N[id as (typeof HEALTH_CONDITION_IDS)[number]]);
  }
  return id;
}

export function formatConditionTypesSummary(types: string[] | undefined, t: TFunction): string {
  if (!types?.length) return "";
  const filtered = types.filter((id) => id !== "none");
  if (!filtered.length) return "";
  return filtered.map((id) => formatConditionTypeLabel(id, t)).join(", ");
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
    else if ((HEALTH_CONDITION_IDS as readonly string[]).includes(raw)) selected.add(raw);
  }
  return { selected, customTags };
}

export function buildHealthConditionTypesPayload(
  selected: Set<string>,
  customTags: string[],
): string[] {
  const cond: string[] = [];
  selected.forEach((id) => {
    if ((HEALTH_CONDITION_IDS as readonly string[]).includes(id)) cond.push(id);
  });
  customTags.forEach((c) => cond.push(`other:${c}`));
  return cond;
}
