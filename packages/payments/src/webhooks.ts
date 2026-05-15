import type Stripe from "stripe";
import { prisma } from "@famm/db";
import { getStripeClient } from "./client";
import { computeCommissions, defaultSplitRule, type SplitRule } from "./commission";
import { WebhookSignatureError } from "./errors";
import { recordPaymentSucceeded } from "./ledger";
import { scheduleRetry } from "./retry";
import { upsertSubscriptionFromStripe } from "./subscriptions";

/**
 * Verify a Stripe webhook signature and return the parsed event.
 * Throws WebhookSignatureError on any verification failure.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secretOverride?: string
): Stripe.Event {
  const stripe = getStripeClient();
  const secret = secretOverride ?? process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    throw new WebhookSignatureError(err);
  }
}

export type StripeEventType = Stripe.Event["type"];

type Handler = (event: Stripe.Event) => Promise<void>;

/**
 * Idempotent dispatcher. Records receipt of every webhook in
 * `StripeWebhookEvent`. If a handler throws, the event is marked failed and
 * the error is rethrown so Stripe can retry.
 */
export class WebhookRouter {
  private handlers = new Map<string, Handler>();
  private defaultHandler: Handler | null = null;

  on(eventType: StripeEventType | StripeEventType[], handler: Handler): this {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    for (const t of types) this.handlers.set(t, handler);
    return this;
  }

  onAny(handler: Handler): this {
    this.defaultHandler = handler;
    return this;
  }

  /**
   * Persist event then dispatch. Returns:
   *  - "processed" first time we processed it,
   *  - "duplicate" if we have already processed it,
   *  - "unhandled" if no handler is registered (still recorded).
   */
  async handle(event: Stripe.Event): Promise<"processed" | "duplicate" | "unhandled"> {
    const existing = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
    if (existing?.processedAt) return "duplicate";

    await prisma.stripeWebhookEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        type: event.type,
        livemode: event.livemode,
        apiVersion: event.api_version,
        payload: event as unknown as object,
      },
      update: { attempts: { increment: 1 } },
    });

    const handler = this.handlers.get(event.type) ?? this.defaultHandler;
    if (!handler) {
      await prisma.stripeWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
      return "unhandled";
    }

    try {
      await handler(event);
      await prisma.stripeWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), errorMessage: null, failedAt: null },
      });
      return "processed";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.stripeWebhookEvent.update({
        where: { id: event.id },
        data: { failedAt: new Date(), errorMessage: msg },
      });
      throw err;
    }
  }
}

// ─── Default handlers ────────────────────────────────────────────────────────

/**
 * Build a fully-wired router covering the events this system cares about.
 * Callers may add or override handlers before invoking `.handle()`.
 */
export function buildDefaultRouter(
  opts: { resolveSplitRule?: (paymentId: string) => Promise<SplitRule> } = {}
): WebhookRouter {
  const router = new WebhookRouter();

  router.on("checkout.session.completed", async (event) => {
    const session = event.data.object as Stripe.Checkout.Session;
    await prisma.payment.updateMany({
      where: { stripeCheckoutSessionId: session.id },
      data: {
        ...(typeof session.payment_intent === "string"
          ? { stripePaymentIntentId: session.payment_intent }
          : {}),
        status: session.payment_status === "paid" ? "PROCESSING" : "PENDING",
      },
    });
  });

  router.on("payment_intent.succeeded", async (event) => {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: intent.id },
    });
    if (!payment) return;

    // Charge details for fee accounting.
    const charge =
      intent.latest_charge && typeof intent.latest_charge === "string"
        ? await getStripeClient().charges.retrieve(intent.latest_charge, {
            expand: ["balance_transaction"],
          })
        : null;
    const balanceTxn = charge?.balance_transaction;
    const stripeFee = typeof balanceTxn === "object" && balanceTxn ? balanceTxn.fee : 0;
    const net = typeof balanceTxn === "object" && balanceTxn ? balanceTxn.net : intent.amount;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        succeededAt: new Date(),
        stripeChargeId: charge?.id ?? null,
        stripeFeeAmount: stripeFee,
        netAmount: net,
      },
    });

    const rule = opts.resolveSplitRule
      ? await opts.resolveSplitRule(payment.id)
      : await resolveSplitRule(payment.tenantId, payment.trainerProfileId);

    let leadTrainerProfileId: string | null = null;
    if (payment.trainerProfileId) {
      const tp = await prisma.trainerProfile.findUnique({
        where: { id: payment.trainerProfileId },
        select: { leadTrainerId: true },
      });
      leadTrainerProfileId = tp?.leadTrainerId ?? null;
    }

    const result = computeCommissions({
      grossAmount: payment.amount,
      currency: payment.currency,
      stripeFeeAmount: stripeFee,
      ...(payment.trainerProfileId ? { trainerProfileId: payment.trainerProfileId } : {}),
      ...(leadTrainerProfileId ? { leadTrainerProfileId } : {}),
      rule,
    });

    await prisma.$transaction(async (tx) => {
      for (const a of result.allocations) {
        await tx.commission.create({
          data: {
            tenantId: payment.tenantId,
            paymentId: payment.id,
            beneficiaryType: a.beneficiaryType,
            beneficiaryId: a.beneficiaryId,
            ...(a.role === "TRAINER" || a.role === "LEAD_TRAINER"
              ? { trainerProfileId: a.beneficiaryId ?? null }
              : {}),
            role: a.role,
            rateBps: a.rateBps,
            amount: a.amount,
            currency: payment.currency,
            status: "ACCRUED",
          },
        });
      }

      if (payment.bookingId) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { paymentStatus: "PAID" },
        });
      }
    });

    await recordPaymentSucceeded({
      tenantId: payment.tenantId,
      paymentId: payment.id,
      currency: payment.currency,
      grossAmount: payment.amount,
      stripeFeeAmount: stripeFee,
      allocations: result.allocations.map((a) => ({
        role: a.role,
        beneficiaryId: a.beneficiaryId,
        amount: a.amount,
      })),
    });
  });

  router.on("payment_intent.payment_failed", async (event) => {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: intent.id },
    });
    if (!payment) return;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureCode: intent.last_payment_error?.code ?? null,
        failureMessage: intent.last_payment_error?.message ?? null,
      },
    });
    if (payment.bookingId) {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: "FAILED" },
      });
    }
    await scheduleRetry(payment.id, {
      ...(intent.last_payment_error?.code ? { failureCode: intent.last_payment_error.code } : {}),
      ...(intent.last_payment_error?.message
        ? { failureMessage: intent.last_payment_error.message }
        : {}),
    });
  });

  router.on("charge.refunded", async (event) => {
    const charge = event.data.object as Stripe.Charge;
    const payment = await prisma.payment.findFirst({
      where: { stripeChargeId: charge.id },
    });
    if (!payment) return;
    const refunded = charge.amount_refunded;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amountRefunded: refunded,
        status: refunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED",
        ...(refunded >= payment.amount ? { refundedAt: new Date() } : {}),
      },
    });
  });

  router.on(
    [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ],
    async (event) => {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscriptionFromStripe(sub);
    }
  );

  router.on("invoice.payment_succeeded", async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    if (typeof invoice.subscription === "string") {
      const sub = await getStripeClient().subscriptions.retrieve(invoice.subscription);
      await upsertSubscriptionFromStripe(sub);
    }
  });

  router.on("invoice.payment_failed", async (event) => {
    const invoice = event.data.object as Stripe.Invoice;
    if (typeof invoice.subscription !== "string") return;
    const sub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription },
    });
    if (!sub) return;
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE" },
    });
  });

  router.on("account.updated", async (event) => {
    const acc = event.data.object as Stripe.Account;
    await prisma.trainerProfile.updateMany({
      where: { stripeConnectAccountId: acc.id },
      data: { stripeConnectOnboarded: acc.charges_enabled && acc.payouts_enabled },
    });
  });

  router.on(["payout.paid", "payout.failed"], async (event) => {
    const so = event.data.object as Stripe.Payout;
    await prisma.payout.updateMany({
      where: { stripePayoutId: so.id },
      data: {
        status: event.type === "payout.paid" ? "PAID" : "FAILED",
        ...(event.type === "payout.paid" ? { paidAt: new Date() } : {}),
        ...(event.type === "payout.failed"
          ? { failureCode: so.failure_code ?? null, failureMessage: so.failure_message ?? null }
          : {}),
      },
    });
  });

  return router;
}

/**
 * Look up the effective revenue split rule for a payment. Resolution order:
 *  1. Trainer-specific active rule
 *  2. Tenant-wide active rule (no trainerProfileId)
 *  3. Defaults from `defaultSplitRule`.
 */
export async function resolveSplitRule(
  tenantId: string,
  trainerProfileId: string | null
): Promise<SplitRule> {
  const now = new Date();
  const baseWhere = {
    tenantId,
    isActive: true,
    AND: [
      { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
      { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
    ],
  };

  if (trainerProfileId) {
    const trainerRule = await prisma.revenueSplitRule.findFirst({
      where: { ...baseWhere, trainerProfileId },
      orderBy: { priority: "desc" },
    });
    if (trainerRule) return pickBps(trainerRule);
  }

  const tenantRule = await prisma.revenueSplitRule.findFirst({
    where: { ...baseWhere, trainerProfileId: null },
    orderBy: { priority: "desc" },
  });
  if (tenantRule) return pickBps(tenantRule);

  const hasLead = trainerProfileId
    ? Boolean(
        (
          await prisma.trainerProfile.findUnique({
            where: { id: trainerProfileId },
            select: { leadTrainerId: true },
          })
        )?.leadTrainerId
      )
    : false;
  return defaultSplitRule({ hasLeadTrainer: hasLead });
}

function pickBps(r: {
  platformBps: number;
  tenantBps: number;
  trainerBps: number;
  leadTrainerBps: number;
}): SplitRule {
  return {
    platformBps: r.platformBps,
    tenantBps: r.tenantBps,
    trainerBps: r.trainerBps,
    leadTrainerBps: r.leadTrainerBps,
  };
}
