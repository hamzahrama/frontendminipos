export type PlanCode = "FREE" | "PRO" | "ENTERPRISE";

export type Plan = {
  code: PlanCode;
  name: string;
  priceRp: number;
  maxCashiers: number;
  maxProducts: number;
  features: {
    whatsapp: boolean;
    reports: boolean;
    publicCatalog: boolean;
    bonusSimulator: boolean;
    offlineSync: boolean;
  };
};

export const PLANS: Record<PlanCode, Plan> = {
  FREE: {
    code: "FREE",
    name: "Free",
    priceRp: 0,
    maxCashiers: 1,
    maxProducts: 100,
    features: { whatsapp: false, reports: true, publicCatalog: false, bonusSimulator: false, offlineSync: false },
  },
  PRO: {
    code: "PRO",
    name: "Pro",
    priceRp: 99000,
    maxCashiers: 5,
    maxProducts: 2000,
    features: { whatsapp: true, reports: true, publicCatalog: true, bonusSimulator: true, offlineSync: true },
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Enterprise",
    priceRp: 299000,
    maxCashiers: 50,
    maxProducts: 20000,
    features: { whatsapp: true, reports: true, publicCatalog: true, bonusSimulator: true, offlineSync: true },
  },
};

export function planFor(code: string | null | undefined): Plan {
  const upper = (code ?? "FREE").toUpperCase() as PlanCode;
  return PLANS[upper] ?? PLANS.FREE;
}

export function canUseFeature(plan: Plan, feature: keyof Plan["features"]): boolean {
  return plan.features[feature];
}
