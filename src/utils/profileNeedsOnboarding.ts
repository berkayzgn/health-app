import type { ProfileResponse } from "../services/authService";

/** En az bir hastalık / alerji kodu seçilmediyse onboarding gösterilir. */
export function profileNeedsOnboarding(p: ProfileResponse | null | undefined): boolean {
  if (p == null) return true;
  const types = (p.conditionTypes ?? []).filter((c) => c !== "none");
  return types.length === 0;
}
