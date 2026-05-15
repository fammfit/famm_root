import { BPS_DENOMINATOR, DEFAULT_LEAD_TRAINER_BPS, DEFAULT_PLATFORM_FEE_BPS } from "./config";
import { SplitConfigurationError } from "./errors";
import { allocate, type Cents } from "./money";

export interface SplitRule {
  platformBps: number;
  tenantBps: number;
  trainerBps: number;
  leadTrainerBps: number;
}

export interface SplitContext {
  /** Gross amount paid by customer in minor units (before Stripe fees). */
  grossAmount: Cents;
  currency: string;
  /** Stripe processing fee absorbed by the platform. */
  stripeFeeAmount?: Cents;
  trainerProfileId?: string;
  leadTrainerProfileId?: string;
  rule: SplitRule;
}

export interface BeneficiaryAllocation {
  role: "PLATFORM" | "TENANT" | "TRAINER" | "LEAD_TRAINER";
  beneficiaryType: "platform" | "tenant" | "trainer" | "lead_trainer";
  beneficiaryId: string | null;
  amount: Cents;
  rateBps: number;
}

export interface SplitResult {
  grossAmount: Cents;
  netDistributable: Cents;
  stripeFeeAmount: Cents;
  allocations: BeneficiaryAllocation[];
}

export function validateSplitRule(rule: SplitRule): void {
  const entries = Object.entries(rule) as Array<[keyof SplitRule, number]>;
  for (const [k, v] of entries) {
    if (!Number.isInteger(v) || v < 0 || v > BPS_DENOMINATOR) {
      throw new SplitConfigurationError(
        `${k} must be an integer between 0 and ${BPS_DENOMINATOR}, got ${v}`
      );
    }
  }
  const total = rule.platformBps + rule.tenantBps + rule.trainerBps + rule.leadTrainerBps;
  if (total > BPS_DENOMINATOR) {
    throw new SplitConfigurationError(
      `Total split bps must be <= ${BPS_DENOMINATOR}, got ${total}`
    );
  }
}

export function defaultSplitRule(opts: { hasLeadTrainer: boolean }): SplitRule {
  const platform = DEFAULT_PLATFORM_FEE_BPS;
  const lead = opts.hasLeadTrainer ? DEFAULT_LEAD_TRAINER_BPS : 0;
  const trainer = BPS_DENOMINATOR - platform - lead;
  return { platformBps: platform, tenantBps: 0, trainerBps: trainer, leadTrainerBps: lead };
}

/**
 * Compute commission allocations.
 *
 * Rounding policy: largest-remainder allocation guarantees that the sum of
 * beneficiary amounts equals `netDistributable` exactly. Stripe fees, if
 * supplied, are subtracted from the gross before allocation.
 */
export function computeCommissions(ctx: SplitContext): SplitResult {
  validateSplitRule(ctx.rule);
  const stripeFee = ctx.stripeFeeAmount ?? 0;
  if (stripeFee < 0) throw new SplitConfigurationError("stripeFeeAmount cannot be negative");
  if (ctx.grossAmount < 0) throw new SplitConfigurationError("grossAmount cannot be negative");

  const net = Math.max(0, ctx.grossAmount - stripeFee);

  // Effective bps per bucket, including dropped buckets routed to platform.
  let platformBps = ctx.rule.platformBps;
  const tenantBps = ctx.rule.tenantBps;
  let trainerBps = ctx.rule.trainerBps;
  let leadBps = ctx.rule.leadTrainerBps;

  if (leadBps > 0 && !ctx.leadTrainerProfileId) {
    platformBps += leadBps;
    leadBps = 0;
  }
  if (trainerBps > 0 && !ctx.trainerProfileId) {
    platformBps += trainerBps;
    trainerBps = 0;
  }

  // Residue (when bps sum < 10000) accrues to the platform.
  const ruleSum = platformBps + tenantBps + leadBps + trainerBps;
  if (ruleSum < BPS_DENOMINATOR) {
    platformBps += BPS_DENOMINATOR - ruleSum;
  }

  const weights: number[] = [];
  const skeleton: Array<Omit<BeneficiaryAllocation, "amount">> = [];

  if (platformBps > 0) {
    weights.push(platformBps);
    skeleton.push({
      role: "PLATFORM",
      beneficiaryType: "platform",
      beneficiaryId: null,
      rateBps: platformBps,
    });
  }
  if (tenantBps > 0) {
    weights.push(tenantBps);
    skeleton.push({
      role: "TENANT",
      beneficiaryType: "tenant",
      beneficiaryId: null,
      rateBps: tenantBps,
    });
  }
  if (leadBps > 0 && ctx.leadTrainerProfileId) {
    weights.push(leadBps);
    skeleton.push({
      role: "LEAD_TRAINER",
      beneficiaryType: "lead_trainer",
      beneficiaryId: ctx.leadTrainerProfileId,
      rateBps: leadBps,
    });
  }
  if (trainerBps > 0 && ctx.trainerProfileId) {
    weights.push(trainerBps);
    skeleton.push({
      role: "TRAINER",
      beneficiaryType: "trainer",
      beneficiaryId: ctx.trainerProfileId,
      rateBps: trainerBps,
    });
  }

  const amounts = allocate(net, weights);
  const allocations = skeleton.map((s, i) => ({ ...s, amount: amounts[i]! }));

  return {
    grossAmount: ctx.grossAmount,
    netDistributable: net,
    stripeFeeAmount: stripeFee,
    allocations,
  };
}

/**
 * For a refund of `refundAmount`, compute proportional reversals against the
 * original allocations. Reversals must sum exactly to `refundAmount`.
 */
export function computeRefundReversals(
  originalAllocations: BeneficiaryAllocation[],
  refundAmount: Cents,
  originalNet: Cents
): BeneficiaryAllocation[] {
  if (refundAmount <= 0 || originalNet <= 0) return [];
  if (refundAmount > originalNet) {
    throw new SplitConfigurationError(`refund ${refundAmount} exceeds original net ${originalNet}`);
  }
  const weights = originalAllocations.map((a) => a.amount);
  const reversed = allocate(refundAmount, weights);
  return originalAllocations.map((a, i) => ({ ...a, amount: -reversed[i]! }));
}
