import type Stripe from "stripe";
import { prisma } from "@famm/db";
import { getStripeClient } from "./client";
import { computeRefundReversals } from "./commission";
import { RefundExceedsPaymentError } from "./errors";
import { recordRefund } from "./ledger";

export interface CreateRefundInput {
  paymentId: string;
  /** Amount in minor units. Omit for full refund of remaining balance. */
  amount?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  /** Reverse trainer/lead commissions in addition to platform side. Default: true. */
  reverseCommissions?: boolean;
  /** Optional Stripe idempotency key. */
  idempotencyKey?: string;
  metadata?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  stripeRefundId: string;
  amount: number;
  status: string;
}

/**
 * Issue a refund. Handles:
 *   - Validating the requested amount against the remaining refundable amount.
 *   - Calling Stripe with idempotency.
 *   - Reversing commission accruals proportionally.
 *   - Writing balanced ledger entries.
 *   - Updating the parent Payment status.
 *
 * If the original charge used Connect destination charges, Stripe will also
 * reverse the associated application_fee + transfer.
 */
export async function createRefund(input: CreateRefundInput): Promise<RefundResult> {
  const stripe = getStripeClient();

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { commissions: true },
  });
  if (!payment) throw new Error(`Payment ${input.paymentId} not found`);
  if (!payment.stripePaymentIntentId && !payment.stripeChargeId) {
    throw new Error(`Payment ${input.paymentId} has no Stripe reference yet`);
  }

  const remaining = payment.amount - payment.amountRefunded;
  const requested = input.amount ?? remaining;
  if (requested <= 0 || requested > remaining) {
    throw new RefundExceedsPaymentError(payment.id, requested, remaining);
  }

  const stripeRefund: Stripe.Refund = await stripe.refunds.create(
    {
      ...(payment.stripePaymentIntentId
        ? { payment_intent: payment.stripePaymentIntentId }
        : { charge: payment.stripeChargeId! }),
      amount: requested,
      ...(input.reason ? { reason: input.reason } : {}),
      reverse_transfer: Boolean(payment.destinationAccountId),
      refund_application_fee: Boolean(payment.destinationAccountId),
      metadata: {
        paymentId: payment.id,
        ...(input.metadata ?? {}),
      },
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
  );

  const refund = await prisma.refund.create({
    data: {
      tenantId: payment.tenantId,
      paymentId: payment.id,
      stripeRefundId: stripeRefund.id,
      amount: requested,
      currency: payment.currency,
      reason: input.reason ?? null,
      status: stripeRefund.status === "succeeded" ? "SUCCEEDED" : "PENDING",
      metadata: input.metadata ?? {},
    },
  });

  const newRefunded = payment.amountRefunded + requested;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      amountRefunded: newRefunded,
      status: newRefunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED",
      ...(newRefunded >= payment.amount ? { refundedAt: new Date() } : {}),
    },
  });

  // Reverse commissions if any were accrued.
  if (input.reverseCommissions !== false && payment.commissions.length > 0) {
    const reversals = computeRefundReversals(
      payment.commissions.map((c) => ({
        role:
          c.role === "TRAINER"
            ? "TRAINER"
            : c.role === "LEAD_TRAINER"
              ? "LEAD_TRAINER"
              : c.role === "TENANT"
                ? "TENANT"
                : "PLATFORM",
        beneficiaryType:
          c.beneficiaryType === "trainer"
            ? "trainer"
            : c.beneficiaryType === "lead_trainer"
              ? "lead_trainer"
              : c.beneficiaryType === "tenant"
                ? "tenant"
                : "platform",
        beneficiaryId: c.beneficiaryId ?? null,
        amount: c.amount,
        rateBps: c.rateBps,
      })),
      requested,
      Math.max(0, payment.amount - payment.stripeFeeAmount)
    );

    await prisma.$transaction(async (tx) => {
      for (const r of reversals) {
        await tx.commission.create({
          data: {
            tenantId: payment.tenantId,
            paymentId: payment.id,
            beneficiaryType: r.beneficiaryType,
            beneficiaryId: r.beneficiaryId,
            ...(r.role === "TRAINER" || r.role === "LEAD_TRAINER"
              ? { trainerProfileId: r.beneficiaryId ?? null }
              : {}),
            role: r.role,
            rateBps: r.rateBps,
            amount: r.amount, // negative
            currency: payment.currency,
            status: "REVERSED",
          },
        });
      }
      await tx.refund.update({ where: { id: refund.id }, data: { reversedCommissions: true } });
    });

    await recordRefund({
      tenantId: payment.tenantId,
      paymentId: payment.id,
      refundId: refund.id,
      currency: payment.currency,
      refundAmount: requested,
      reversals: reversals
        .map((r) => ({ role: r.role, beneficiaryId: r.beneficiaryId, amount: Math.abs(r.amount) }))
        .filter((r) => r.amount > 0),
    });
  }

  return {
    refundId: refund.id,
    stripeRefundId: stripeRefund.id,
    amount: requested,
    status: refund.status,
  };
}
