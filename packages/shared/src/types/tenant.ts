export type TenantPlan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CHURNED";

export interface TenantContext {
  tenantId: string;
  slug: string;
  plan: TenantPlan;
  timezone: string;
  currency: string;
}
