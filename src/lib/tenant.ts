import { CompanyStatus, SubscriptionPlan } from "@prisma/client";

export type SaaSFeature = "gps" | "qr" | "insights" | "face";

const planFeatures: Record<SubscriptionPlan, SaaSFeature[]> = {
  STARTER: [],
  GROWTH: ["gps", "qr", "insights"],
  PREMIUM: ["gps", "qr", "insights", "face"],
};

export function tenantHasFeature(plan: SubscriptionPlan, feature: SaaSFeature) {
  return planFeatures[plan].includes(feature);
}

export function tenantIsActive(status: CompanyStatus) {
  return status === CompanyStatus.ACTIVE;
}

export const subscriptionPlanLabels: Record<SubscriptionPlan, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PREMIUM: "Premium",
};
