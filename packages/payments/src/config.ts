// Centralized configuration for the payments package.

export const STRIPE_API_VERSION = "2024-06-20" as const;

/**
 * Platform-level defaults used when a tenant has no override.
 * Values are basis points (1/100 of a percent), 1500 = 15.00%.
 */
export const DEFAULT_PLATFORM_FEE_BPS = 1500;
export const DEFAULT_TENANT_BPS = 0;
export const DEFAULT_LEAD_TRAINER_BPS = 1000;

/**
 * Failed payment recovery (smart retry) schedule.
 * Values are minutes after the previous attempt.
 */
export const RETRY_SCHEDULE_MINUTES = [60, 60 * 24, 60 * 24 * 3, 60 * 24 * 5];
export const MAX_RETRY_ATTEMPTS = RETRY_SCHEDULE_MINUTES.length;

/**
 * Stripe fee approximation for US card payments (2.9% + 30c).
 * Used for ledger projections only; actuals come from balance transactions.
 */
export const STRIPE_FEE_PERCENT_BPS = 290;
export const STRIPE_FEE_FIXED_CENTS = 30;

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const BPS_DENOMINATOR = 10_000;
