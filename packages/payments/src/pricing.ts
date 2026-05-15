import type { Cents } from "./money";

export type TierMode = "graduated" | "volume";

export interface PricingTier {
  /** Upper bound (inclusive) of this tier; null = infinity */
  upTo: number | null;
  /** Per-unit price in minor units */
  unitAmount: Cents;
  /** Optional flat fee in minor units applied once when entering this tier */
  flatAmount?: Cents;
}

/**
 * Compute a tiered price for a given quantity. Mirrors Stripe's two tier modes.
 *
 *   "volume":    all units priced at the tier the quantity lands in.
 *   "graduated": units are split across tiers progressively.
 */
export function computeTieredPrice(quantity: number, tiers: PricingTier[], mode: TierMode): Cents {
  if (quantity <= 0 || tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => {
    if (a.upTo == null) return 1;
    if (b.upTo == null) return -1;
    return a.upTo - b.upTo;
  });

  if (mode === "volume") {
    const tier = sorted.find((t) => t.upTo == null || quantity <= t.upTo);
    if (!tier) return 0;
    return tier.unitAmount * quantity + (tier.flatAmount ?? 0);
  }

  // graduated
  let total = 0;
  let consumed = 0;
  for (const tier of sorted) {
    if (consumed >= quantity) break;
    const ceiling = tier.upTo ?? Infinity;
    const slice = Math.min(quantity, ceiling) - consumed;
    if (slice <= 0) continue;
    total += slice * tier.unitAmount + (tier.flatAmount ?? 0);
    consumed += slice;
  }
  return total;
}

// ─── Dynamic Pricing Hooks ────────────────────────────────────────────────────
//
// A dynamic-pricing hook is a function that, given an evaluation context (item,
// customer, time, demand signals), returns an adjustment (multiplier and/or
// addend) and a reason. Hooks are pure and composable; the engine applies them
// in `priority` order and clamps to configured min/max.

export interface DynamicPricingContext {
  tenantId: string;
  serviceId?: string;
  trainerProfileId?: string;
  customerId?: string;
  basePrice: Cents;
  currency: string;
  /** When the service occurs (for time-of-day / surge logic). */
  scheduledAt?: Date;
  /** Demand metric supplied by caller, 0..1 typical. */
  utilization?: number;
  /** Extra signals (group size, loyalty tier, etc.). */
  metadata?: Record<string, unknown>;
}

export interface DynamicPricingAdjustment {
  /** Multiplicative factor; 1.0 = no change. */
  factor?: number;
  /** Flat adjustment in minor units (can be negative). */
  delta?: Cents;
  reason: string;
}

export type DynamicPricingHook = (
  ctx: DynamicPricingContext
) => DynamicPricingAdjustment | null | Promise<DynamicPricingAdjustment | null>;

export interface DynamicPricingResult {
  basePrice: Cents;
  finalPrice: Cents;
  adjustments: Array<DynamicPricingAdjustment & { applied: Cents }>;
}

export class DynamicPricingEngine {
  private hooks: Array<{ hook: DynamicPricingHook; priority: number }> = [];
  private minPrice: Cents = 0;
  private maxPriceMultiplier = 5;

  register(hook: DynamicPricingHook, priority = 0): this {
    this.hooks.push({ hook, priority });
    this.hooks.sort((a, b) => b.priority - a.priority);
    return this;
  }

  setBounds(opts: { minPrice?: Cents; maxPriceMultiplier?: number }): this {
    if (opts.minPrice != null) this.minPrice = opts.minPrice;
    if (opts.maxPriceMultiplier != null) this.maxPriceMultiplier = opts.maxPriceMultiplier;
    return this;
  }

  async evaluate(ctx: DynamicPricingContext): Promise<DynamicPricingResult> {
    let price = ctx.basePrice;
    const applied: DynamicPricingResult["adjustments"] = [];

    for (const { hook } of this.hooks) {
      const adj = await hook(ctx);
      if (!adj) continue;
      const before = price;
      if (adj.factor != null) price = Math.round(price * adj.factor);
      if (adj.delta != null) price += adj.delta;
      applied.push({ ...adj, applied: price - before });
    }

    const cap = Math.round(ctx.basePrice * this.maxPriceMultiplier);
    price = Math.max(this.minPrice, Math.min(price, cap));
    return { basePrice: ctx.basePrice, finalPrice: price, adjustments: applied };
  }
}

// Sample hooks ───────────────────────────────────────────────────────────────

export const surgePricingHook: DynamicPricingHook = (ctx) => {
  if (ctx.utilization == null) return null;
  if (ctx.utilization < 0.7) return null;
  const factor = 1 + (ctx.utilization - 0.7) * 2; // 0.7→1.0, 1.0→1.6
  return { factor, reason: "surge_high_utilization" };
};

export const peakHoursHook: DynamicPricingHook = (ctx) => {
  if (!ctx.scheduledAt) return null;
  const hour = ctx.scheduledAt.getHours();
  if (hour >= 17 && hour <= 20) return { factor: 1.15, reason: "peak_evening" };
  if (hour >= 6 && hour <= 8) return { factor: 1.1, reason: "peak_morning" };
  return null;
};

export const loyaltyDiscountHook: (loyaltyBps: number) => DynamicPricingHook =
  (loyaltyBps) => (ctx) => {
    const tier = ctx.metadata?.["loyaltyTier"];
    if (!tier) return null;
    return { factor: 1 - loyaltyBps / 10000, reason: `loyalty_${String(tier)}` };
  };
