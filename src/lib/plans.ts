export type PlanId = "free" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  scanLimit: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    scanLimit: 10,
    tagline: "Try it out at the front desk",
    features: [
      "10 passport scans per month",
      "Searchable records",
      "Excel export",
      "Expiry warnings",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    scanLimit: 150,
    tagline: "For a single busy front desk",
    features: [
      "150 passport scans per month",
      "Everything in Free",
      "Auto-delete records after 30 days",
      "Priority email support",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 79,
    scanLimit: 600,
    tagline: "For multiple properties or high volume",
    features: [
      "600 passport scans per month",
      "Everything in Pro",
      "Highest monthly scan volume",
      "Priority email support",
    ],
  },
];

export const FREE_PLAN = PLANS[0];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((plan) => plan.id === id) ?? FREE_PLAN;
}
