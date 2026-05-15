import { prisma } from "@famm/db";
import { getStripeClient } from "./client";
import { ConnectAccountNotReadyError } from "./errors";
import { recordPayout } from "./ledger";

export interface PayoutPlan {
  trainerProfileId?: string;
  destinationType: "trainer" | "tenant";
  destinationAccountId: string;
  amount: number;
  currency: string;
  commissionIds: string[];
}

/**
 * Build a payout plan for every beneficiary with positive accrued earnings.
 * Each plan groups all ACCRUED commissions for one destination account.
 */
export async function planPayouts(tenantId: string, currency = "USD"): Promise<PayoutPlan[]> {
  const accrued = await prisma.commission.findMany({
    where: { tenantId, status: "ACCRUED", currency, amount: { gt: 0 } },
    include: {
      trainer: { select: { id: true, stripeConnectAccountId: true, stripeConnectOnboarded: true } },
    },
  });

  type Bucket = Omit<PayoutPlan, "commissionIds"> & { commissionIds: string[] };
  const buckets = new Map<string, Bucket>();

  for (const c of accrued) {
    if (c.role === "PLATFORM") continue; // platform doesn't payout
    let destinationAccountId: string | null = null;
    let destinationType: "trainer" | "tenant" = "trainer";

    if (c.role === "TRAINER" || c.role === "LEAD_TRAINER") {
      if (!c.trainer?.stripeConnectAccountId || !c.trainer.stripeConnectOnboarded) continue;
      destinationAccountId = c.trainer.stripeConnectAccountId;
      destinationType = "trainer";
    } else if (c.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { stripeAccountId: true },
      });
      if (!tenant?.stripeAccountId) continue;
      destinationAccountId = tenant.stripeAccountId;
      destinationType = "tenant";
    }
    if (!destinationAccountId) continue;

    const key = `${destinationType}:${destinationAccountId}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.amount += c.amount;
      existing.commissionIds.push(c.id);
    } else {
      buckets.set(key, {
        ...(c.trainerProfileId ? { trainerProfileId: c.trainerProfileId } : {}),
        destinationType,
        destinationAccountId,
        amount: c.amount,
        currency: c.currency,
        commissionIds: [c.id],
      });
    }
  }

  return Array.from(buckets.values()).filter((b) => b.amount > 0);
}

/**
 * Execute a planned payout via Stripe transfer to the connected account.
 * Idempotent via the constructed Payout row id.
 */
export async function executePayout(tenantId: string, plan: PayoutPlan): Promise<string> {
  const stripe = getStripeClient();

  // Make sure the account is ready before we attempt the transfer.
  const account = await stripe.accounts.retrieve(plan.destinationAccountId);
  if (!account.payouts_enabled) {
    throw new ConnectAccountNotReadyError(plan.destinationAccountId);
  }

  const payout = await prisma.payout.create({
    data: {
      tenantId,
      destinationType: plan.destinationType === "trainer" ? "TRAINER" : "TENANT",
      ...(plan.trainerProfileId ? { trainerProfileId: plan.trainerProfileId } : {}),
      destinationAccountId: plan.destinationAccountId,
      amount: plan.amount,
      currency: plan.currency,
      status: "PENDING",
      description: `Payout to ${plan.destinationType} ${plan.destinationAccountId}`,
    },
  });

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: plan.amount,
        currency: plan.currency.toLowerCase(),
        destination: plan.destinationAccountId,
        ...(payout.description ? { description: payout.description } : {}),
        metadata: { tenantId, payoutId: payout.id },
      },
      { idempotencyKey: `transfer_${payout.id}` }
    );

    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payout.id },
        data: { stripeTransferId: transfer.id, status: "IN_TRANSIT" },
      }),
      prisma.commission.updateMany({
        where: { id: { in: plan.commissionIds } },
        data: { status: "PAID", payoutId: payout.id },
      }),
    ]);

    await recordPayout({
      tenantId,
      payoutId: payout.id,
      currency: plan.currency,
      amount: plan.amount,
      destinationType: plan.destinationType,
      destinationId:
        plan.destinationType === "trainer" ? (plan.trainerProfileId ?? "tenant") : tenantId,
    });

    return payout.id;
  } catch (err) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: "FAILED",
        failureMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

export interface EnterprisePayoutInput {
  tenantId: string;
  currency?: string;
  dryRun?: boolean;
}

export interface EnterprisePayoutReport {
  total: number;
  payouts: Array<{
    payoutId?: string;
    destinationType: "trainer" | "tenant";
    destinationAccountId: string;
    amount: number;
    commissionCount: number;
    status: "executed" | "skipped" | "failed";
    error?: string;
  }>;
}

/**
 * Enterprise-grade batch payout: plans, executes, and reports. Failures on
 * individual destinations don't abort the batch — they are reported.
 */
export async function runEnterprisePayoutBatch(
  input: EnterprisePayoutInput
): Promise<EnterprisePayoutReport> {
  const plans = await planPayouts(input.tenantId, input.currency ?? "USD");
  const report: EnterprisePayoutReport = { total: 0, payouts: [] };

  for (const plan of plans) {
    report.total += plan.amount;
    if (input.dryRun) {
      report.payouts.push({
        destinationType: plan.destinationType,
        destinationAccountId: plan.destinationAccountId,
        amount: plan.amount,
        commissionCount: plan.commissionIds.length,
        status: "skipped",
      });
      continue;
    }
    try {
      const id = await executePayout(input.tenantId, plan);
      report.payouts.push({
        payoutId: id,
        destinationType: plan.destinationType,
        destinationAccountId: plan.destinationAccountId,
        amount: plan.amount,
        commissionCount: plan.commissionIds.length,
        status: "executed",
      });
    } catch (err) {
      report.payouts.push({
        destinationType: plan.destinationType,
        destinationAccountId: plan.destinationAccountId,
        amount: plan.amount,
        commissionCount: plan.commissionIds.length,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return report;
}
