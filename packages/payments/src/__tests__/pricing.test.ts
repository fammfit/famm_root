import { describe, expect, it } from "vitest";
import {
  DynamicPricingEngine,
  computeTieredPrice,
  loyaltyDiscountHook,
  peakHoursHook,
  surgePricingHook,
  type PricingTier,
} from "../pricing";

describe("computeTieredPrice", () => {
  const tiers: PricingTier[] = [
    { upTo: 10, unitAmount: 1000 },
    { upTo: 50, unitAmount: 800 },
    { upTo: null, unitAmount: 500 },
  ];

  it("volume mode: prices all units at landing tier", () => {
    expect(computeTieredPrice(5, tiers, "volume")).toBe(5 * 1000);
    expect(computeTieredPrice(30, tiers, "volume")).toBe(30 * 800);
    expect(computeTieredPrice(100, tiers, "volume")).toBe(100 * 500);
  });

  it("graduated mode: prices units progressively", () => {
    expect(computeTieredPrice(5, tiers, "graduated")).toBe(5 * 1000);
    expect(computeTieredPrice(15, tiers, "graduated")).toBe(10 * 1000 + 5 * 800);
    expect(computeTieredPrice(60, tiers, "graduated")).toBe(10 * 1000 + 40 * 800 + 10 * 500);
  });

  it("returns 0 for non-positive quantity", () => {
    expect(computeTieredPrice(0, tiers, "volume")).toBe(0);
    expect(computeTieredPrice(-5, tiers, "graduated")).toBe(0);
  });

  it("applies flatAmount once per traversed tier in graduated mode", () => {
    const t: PricingTier[] = [
      { upTo: 5, unitAmount: 100, flatAmount: 50 },
      { upTo: null, unitAmount: 200, flatAmount: 75 },
    ];
    expect(computeTieredPrice(8, t, "graduated")).toBe(5 * 100 + 50 + 3 * 200 + 75);
  });
});

describe("DynamicPricingEngine", () => {
  it("applies factor hooks in priority order", async () => {
    const engine = new DynamicPricingEngine();
    engine.register(() => ({ factor: 1.2, reason: "low" }), 1);
    engine.register(() => ({ factor: 1.5, reason: "high" }), 10);
    const res = await engine.evaluate({ tenantId: "t1", basePrice: 1000, currency: "USD" });
    // higher priority runs first: 1000 * 1.5 = 1500, then * 1.2 = 1800
    expect(res.finalPrice).toBe(1800);
    expect(res.adjustments[0]!.reason).toBe("high");
  });

  it("respects min/max bounds", async () => {
    const engine = new DynamicPricingEngine().setBounds({ minPrice: 100, maxPriceMultiplier: 1.5 });
    engine.register(() => ({ factor: 10, reason: "moon" }));
    const res = await engine.evaluate({ tenantId: "t1", basePrice: 200, currency: "USD" });
    expect(res.finalPrice).toBe(300);
  });

  it("surge hook fires when utilization > 0.7", async () => {
    const engine = new DynamicPricingEngine();
    engine.register(surgePricingHook);
    const res = await engine.evaluate({
      tenantId: "t1",
      basePrice: 1000,
      currency: "USD",
      utilization: 0.9,
    });
    expect(res.finalPrice).toBeGreaterThan(1000);
  });

  it("loyalty hook discounts when tier is set", async () => {
    const engine = new DynamicPricingEngine();
    engine.register(loyaltyDiscountHook(1000)); // 10%
    const res = await engine.evaluate({
      tenantId: "t1",
      basePrice: 1000,
      currency: "USD",
      metadata: { loyaltyTier: "gold" },
    });
    expect(res.finalPrice).toBe(900);
  });

  it("peakHoursHook fires at peak evening", async () => {
    const engine = new DynamicPricingEngine();
    engine.register(peakHoursHook);
    const scheduledAt = new Date();
    scheduledAt.setHours(18, 0, 0, 0);
    const res = await engine.evaluate({
      tenantId: "t1",
      basePrice: 1000,
      currency: "USD",
      scheduledAt,
    });
    expect(res.finalPrice).toBe(1150);
  });
});
