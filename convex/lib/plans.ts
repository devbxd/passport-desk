// Scan limits are mirrored here (not imported from src/) because Convex
// functions bundle separately from the frontend and must not depend on it.
export type PlanId = "free" | "pro" | "business";

export const PLAN_SCAN_LIMITS: Record<PlanId, number> = {
  free: 10,
  pro: 150,
  business: 600,
};

export const DEFAULT_PLAN: PlanId = "free";

/** The plan a user is entitled to right now: a lapsed paid plan counts as free. */
export function effectivePlan(
  user: { plan?: PlanId; planExpiresAt?: string } | null | undefined,
  now = Date.now(),
): PlanId {
  if (!user?.plan) return DEFAULT_PLAN;
  if (user.planExpiresAt && Date.parse(user.planExpiresAt) <= now) {
    return DEFAULT_PLAN;
  }
  return user.plan;
}

/** ISO timestamp `days` from now, or undefined for a permanent plan. */
export function expiryFromDays(days: number | undefined, now = Date.now()) {
  return days ? new Date(now + days * 86_400_000).toISOString() : undefined;
}
