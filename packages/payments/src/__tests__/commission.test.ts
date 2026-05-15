import { describe, expect, it } from "vitest";
import {
  computeCommissions,
  computeRefundReversals,
  defaultSplitRule,
  validateSplitRule,
  type SplitRule,
} from "../commission";
import { SplitConfigurationError } from "../errors";

const trainerRule: SplitRule = {
  platformBps: 1500, // 15%
  tenantBps: 500, // 5%
  trainerBps: 6500, // 65%
  leadTrainerBps: 1500, // 15%
};

describe("validateSplitRule", () => {
  it("accepts valid sums", () => {
    expect(() => validateSplitRule(trainerRule)).not.toThrow();
  });

  it("rejects > 100% total", () => {
    expect(() =>
      validateSplitRule({ platformBps: 5000, tenantBps: 4000, trainerBps: 2000, leadTrainerBps: 0 })
    ).toThrow(SplitConfigurationError);
  });

  it("rejects negative bps", () => {
    expect(() =>
      validateSplitRule({ platformBps: -1, tenantBps: 0, trainerBps: 0, leadTrainerBps: 0 })
    ).toThrow(SplitConfigurationError);
  });
});

describe("defaultSplitRule", () => {
  it("removes lead share when no lead trainer", () => {
    const r = defaultSplitRule({ hasLeadTrainer: false });
    expect(r.leadTrainerBps).toBe(0);
    expect(r.platformBps + r.trainerBps).toBe(10000);
  });

  it("includes lead share when applicable", () => {
    const r = defaultSplitRule({ hasLeadTrainer: true });
    expect(r.leadTrainerBps).toBeGreaterThan(0);
    expect(r.platformBps + r.trainerBps + r.leadTrainerBps).toBe(10000);
  });
});

describe("computeCommissions", () => {
  it("splits gross with no stripe fees exactly", () => {
    const res = computeCommissions({
      grossAmount: 10000, // $100
      currency: "USD",
      stripeFeeAmount: 0,
      trainerProfileId: "trainer_1",
      leadTrainerProfileId: "lead_1",
      rule: trainerRule,
    });
    expect(res.netDistributable).toBe(10000);
    const total = res.allocations.reduce((s, a) => s + a.amount, 0);
    expect(total).toBe(10000);

    const platform = res.allocations.find((a) => a.role === "PLATFORM")!.amount;
    const trainer = res.allocations.find((a) => a.role === "TRAINER")!.amount;
    expect(platform).toBe(1500);
    expect(trainer).toBe(6500);
  });

  it("subtracts stripe fees before allocating", () => {
    const res = computeCommissions({
      grossAmount: 10000,
      currency: "USD",
      stripeFeeAmount: 320,
      trainerProfileId: "trainer_1",
      rule: defaultSplitRule({ hasLeadTrainer: false }),
    });
    expect(res.netDistributable).toBe(9680);
    expect(res.allocations.reduce((s, a) => s + a.amount, 0)).toBe(9680);
  });

  it("routes lead share to platform when no lead trainer present", () => {
    const res = computeCommissions({
      grossAmount: 10000,
      currency: "USD",
      trainerProfileId: "trainer_1",
      rule: trainerRule, // includes 15% lead
    });
    // No lead trainer id was provided → lead bucket is dropped, residue goes to platform.
    const platform = res.allocations.find((a) => a.role === "PLATFORM")!.amount;
    expect(platform).toBe(1500 + 1500);
    expect(res.allocations.find((a) => a.role === "LEAD_TRAINER")).toBeUndefined();
    expect(res.allocations.reduce((s, a) => s + a.amount, 0)).toBe(10000);
  });

  it("handles 1-cent rounding without leakage", () => {
    const res = computeCommissions({
      grossAmount: 333, // $3.33
      currency: "USD",
      trainerProfileId: "trainer_1",
      rule: { platformBps: 3333, tenantBps: 3333, trainerBps: 3334, leadTrainerBps: 0 },
    });
    expect(res.allocations.reduce((s, a) => s + a.amount, 0)).toBe(333);
  });

  it("rejects negative gross", () => {
    expect(() =>
      computeCommissions({ grossAmount: -1, currency: "USD", rule: trainerRule })
    ).toThrow(SplitConfigurationError);
  });
});

describe("computeRefundReversals", () => {
  it("reverses proportionally and sums to refund amount", () => {
    const allocs = computeCommissions({
      grossAmount: 10000,
      currency: "USD",
      trainerProfileId: "trainer_1",
      leadTrainerProfileId: "lead_1",
      rule: trainerRule,
    });

    const reversals = computeRefundReversals(allocs.allocations, 5000, allocs.netDistributable);
    const total = reversals.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(-5000); // negative = reduction
    // Refund of half should approximately halve every allocation.
    for (const r of reversals) {
      const original = allocs.allocations.find((a) => a.role === r.role)!.amount;
      expect(Math.abs(Math.abs(r.amount) - original / 2)).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty for zero refund", () => {
    expect(computeRefundReversals([], 0, 0)).toEqual([]);
  });

  it("throws when refund exceeds original net", () => {
    expect(() => computeRefundReversals([], 1000, 500)).toThrow(SplitConfigurationError);
  });
});
