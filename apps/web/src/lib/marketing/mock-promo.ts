import type { PromoOffer, PublicStats } from "./types";

/**
 * Static fallback for the active promo. Used when the public API stub
 * returns null or the network fails — the page must never render with an
 * empty above-the-fold section.
 *
 * Expiry is 7 days from server boot so the countdown demo doesn't go
 * stale during local dev; production fetches from the real backend.
 */
export const MOCK_PROMO: PromoOffer = {
  id: "promo_intro_30d",
  slug: "intro-30d",
  name: "30 days free intro",
  headline: "30 days free",
  body: "Try every feature on us. No card needed.",
  urgency: "medium",
  priceCents: 0,
  normalPriceCents: 4900,
  currency: "USD",
  // Resolved at request time in the API stub; null here means "open-ended"
  // when this constant is imported by a build-time consumer (e.g. tests).
  expiresAt: null,
  ctaLabel: "Start free",
  featuredBenefits: [
    "Unlimited bookings",
    "Stripe payouts",
    "SMS reminders",
    "Forms & waivers",
    "Workout templates",
    "Mobile app",
  ],
  status: "ACTIVE",
  audience: "TRAINER",
};

export const MOCK_STATS: PublicStats = {
  trainerCount: 1247,
  bookingsLast30dCents: 412_500_00,
  citiesCovered: 84,
};
