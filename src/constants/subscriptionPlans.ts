/** Backend `subscription/plan-limits.ts` ile aynı değerler; mobilde kota gösterimi için. */

export type SubscriptionPlanId = "starter" | "plus" | "pro";

export function normalizeSubscriptionPlan(raw: string | null | undefined): SubscriptionPlanId {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "plus" || s === "pro") return s;
  return "starter";
}

/** `null` = sınırsız günlük tarama */
export function dailyScanLimitForPlan(plan: SubscriptionPlanId): number | null {
  switch (plan) {
    case "starter":
      return 5;
    case "plus":
      return 15;
    case "pro":
      return null;
    default:
      return 5;
  }
}
