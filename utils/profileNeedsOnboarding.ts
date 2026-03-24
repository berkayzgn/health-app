import type { ProfileResponse } from "../services/authService";

/** Yeni kullanıcı: boy ve kilo backend’de yoksa onboarding gösterilir. */
export function profileNeedsOnboarding(p: ProfileResponse | null | undefined): boolean {
  if (p == null) return true;
  const h = String(p.heightCm ?? "").trim();
  const w = String(p.weightKg ?? "").trim();
  return !h || !w;
}
