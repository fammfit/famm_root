export type TenantPlan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CHURNED";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: string;
  updatedAt: string;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  plan: TenantPlan;
  timezone: string;
  currency: string;
}

export interface TenantBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customDomain?: string;
}

export interface TenantSettings {
  timezone: string;
  currency: string;
  locale: string;
  bookingLeadTimeMinutes: number;
  bookingWindowDays: number;
  cancellationWindowHours: number;
  maxConcurrentBookings: number;
  requirePaymentUpfront: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  aiEnabled: boolean;
  aiPersonaName: string;
  aiSystemPrompt?: string;
}
