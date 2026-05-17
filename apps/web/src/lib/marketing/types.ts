/**
 * Marketing-surface types. The PromoOffer shape lives here until the
 * backend model lands; the API stubs and mock fallback both consume it.
 */

export type PromoUrgency = "low" | "medium" | "high";
export type PromoStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "ARCHIVED";
export type PromoAudience = "TRAINER" | "CLIENT" | "ALL";

export interface PromoOffer {
  id: string;
  slug: string;
  name: string;
  headline: string;
  body: string;
  urgency: PromoUrgency;
  priceCents: number | null;
  normalPriceCents: number;
  currency: string;
  expiresAt: string | null;
  ctaLabel: string;
  featuredBenefits: ReadonlyArray<string>;
  status: PromoStatus;
  audience: PromoAudience;
}

export interface PublicStats {
  trainerCount: number;
  bookingsLast30dCents: number;
  citiesCovered: number;
}

export interface LeadSubmissionInput {
  email?: string;
  phone?: string;
  source: string;
  promoSlug?: string;
  refCode?: string;
  metadata?: Record<string, unknown>;
  /** Honeypot — must be empty. */
  company?: string;
}

export interface LeadSubmissionResult {
  id: string;
  deduped: boolean;
}

export interface AnalyticsEvent {
  name: string;
  payload?: Record<string, unknown>;
}
