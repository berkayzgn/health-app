/** Mobil ödeme ekranı ile aynı kimlikler: src/app/payment/manage.tsx PlanId */
export const SUBSCRIPTION_PLAN_IDS = ['starter', 'plus', 'pro'] as const;
export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

export function normalizeSubscriptionPlan(raw: string | null | undefined): SubscriptionPlanId {
  const s = (raw ?? '').trim().toLowerCase();
  return SUBSCRIPTION_PLAN_IDS.includes(s as SubscriptionPlanId)
    ? (s as SubscriptionPlanId)
    : 'starter';
}

/** Günlük `POST /label-scan` hakkı (kullanıcı yerel günü boyunca). `null` = sınırsız. */
export function dailyScanLimitForPlan(plan: SubscriptionPlanId): number | null {
  switch (plan) {
    case 'starter':
      return 5;
    case 'plus':
      return 15;
    case 'pro':
      return null;
    default:
      return 5;
  }
}
