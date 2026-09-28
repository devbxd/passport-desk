// Scan limits are mirrored here (not imported from src/) because Convex
// functions bundle separately from the frontend and must not depend on it.
export type PlanId = "free" | "pro" | "business";

export const PLAN_SCAN_LIMITS: Record<PlanId, number> = {
  free: 10,
  pro: 150,
  business: 600,
};

export const DEFAULT_PLAN: PlanId = "free";
