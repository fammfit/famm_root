import type Stripe from "stripe";
import { prisma } from "@famm/db";
import { getStripeClient } from "./client";
import { defaultSplitRule, type SplitRule } from "./commission";
import { DEFAULT_PLATFORM_FEE_BPS, BPS_DENOMINATOR } from "./config";

export interface CreateCheckoutSessionInput {
  tenantId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  /** Either a single price/qty list, or ad-hoc line items. */
  lineItems: Array<{
    priceId?: string;
    quantity: number;
    adhoc?: {
      name: string;
      description?: string;
      amount: number; // minor units
      currency: string;
    };
  }>;
  mode: "payment" | "subscription" | "setup";
  bookingId?: string;
  trainerProfileId?: string;
  /** When set, payment flows to the connected account with an application fee. */
  destinationAccountId?: string;
  /** Override split rule (otherwise computed from tenant defaults). */
  splitRule?: SplitRule;
  metadata?: Record<string, string>;
  /** Idempotency key for Stripe request. */
  idempotencyKey?: string;
  /** Subscription trial period (days), only used when mode = subscription. */
  trialPeriodDays?: number;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  paymentId: string;
}

/**
 * Create a Stripe Checkout session and a matching Payment record in a single
 * step. The Payment row is the local source of truth — webhooks update it as
 * the session progresses to `complete`.
 *
 * If `destinationAccountId` is provided this becomes a Connect destination
 * charge: payment is created on the platform with `transfer_data.destination`
 * and `application_fee_amount` set from the split rule.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient();

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = input.lineItems.map((li) => {
    if (li.priceId) return { price: li.priceId, quantity: li.quantity };
    if (!li.adhoc) throw new Error("Each line item must specify either priceId or adhoc");
    return {
      quantity: li.quantity,
      price_data: {
        currency: li.adhoc.currency.toLowerCase(),
        product_data: {
          name: li.adhoc.name,
          ...(li.adhoc.description ? { description: li.adhoc.description } : {}),
        },
        unit_amount: li.adhoc.amount,
      },
    };
  });

  // Pre-compute the gross to derive application_fee_amount for connect mode.
  const gross = await computeGrossAmount(input.lineItems);
  const currency = await detectCurrency(input.lineItems);

  let applicationFeeAmount = 0;
  const rule =
    input.splitRule ??
    defaultSplitRule({ hasLeadTrainer: Boolean(await leadTrainerExists(input.trainerProfileId)) });

  if (input.destinationAccountId) {
    // Platform retains platform + tenant share; trainer/lead share transferred.
    const platformPlusTenantBps = rule.platformBps + rule.tenantBps;
    applicationFeeAmount = Math.floor((gross * platformPlusTenantBps) / BPS_DENOMINATOR);
  }

  const metadata: Record<string, string> = {
    tenantId: input.tenantId,
    ...(input.bookingId ? { bookingId: input.bookingId } : {}),
    ...(input.trainerProfileId ? { trainerProfileId: input.trainerProfileId } : {}),
    ...(input.metadata ?? {}),
  };

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: input.mode,
    line_items,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata,
    ...(input.customerId ? { customer: input.customerId } : {}),
    ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
  };

  if (input.mode === "payment") {
    params.payment_intent_data = {
      metadata,
      ...(input.destinationAccountId
        ? {
            application_fee_amount: applicationFeeAmount,
            transfer_data: { destination: input.destinationAccountId },
          }
        : {}),
    };
  } else if (input.mode === "subscription") {
    params.subscription_data = {
      metadata,
      ...(input.trialPeriodDays ? { trial_period_days: input.trialPeriodDays } : {}),
      ...(input.destinationAccountId
        ? {
            application_fee_percent: (rule.platformBps + rule.tenantBps) / 100,
            transfer_data: { destination: input.destinationAccountId },
          }
        : {}),
    };
  }

  const session = await stripe.checkout.sessions.create(params, {
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  });

  // Resolve local customer row if any
  let localCustomerId: string | null = null;
  if (input.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: input.customerId },
    });
    localCustomerId = customer?.id ?? null;
  }

  const payment = await prisma.payment.create({
    data: {
      tenantId: input.tenantId,
      ...(localCustomerId ? { customerId: localCustomerId } : {}),
      ...(input.bookingId ? { bookingId: input.bookingId } : {}),
      stripeCheckoutSessionId: session.id,
      amount: gross,
      currency,
      applicationFeeAmount,
      status: "PENDING",
      ...(input.destinationAccountId ? { destinationAccountId: input.destinationAccountId } : {}),
      ...(input.trainerProfileId ? { trainerProfileId: input.trainerProfileId } : {}),
      description: `Checkout session ${session.id}`,
      metadata,
    },
  });

  if (!session.url) throw new Error("Stripe returned no checkout URL");

  return { sessionId: session.id, url: session.url, paymentId: payment.id };
}

async function computeGrossAmount(
  lineItems: CreateCheckoutSessionInput["lineItems"]
): Promise<number> {
  let total = 0;
  for (const li of lineItems) {
    if (li.adhoc) {
      total += li.adhoc.amount * li.quantity;
      continue;
    }
    if (!li.priceId) continue;
    const price = await prisma.price.findUnique({ where: { stripePriceId: li.priceId } });
    if (price?.unitAmount != null) total += price.unitAmount * li.quantity;
  }
  // Fallback when prices not yet mirrored — use platform-defined defaults.
  if (total === 0) {
    total = lineItems.reduce((s, li) => s + (li.adhoc?.amount ?? 0) * li.quantity, 0);
  }
  return total;
}

async function detectCurrency(lineItems: CreateCheckoutSessionInput["lineItems"]): Promise<string> {
  for (const li of lineItems) {
    if (li.adhoc) return li.adhoc.currency.toUpperCase();
    if (li.priceId) {
      const p = await prisma.price.findUnique({ where: { stripePriceId: li.priceId } });
      if (p) return p.currency;
    }
  }
  return "USD";
}

async function leadTrainerExists(trainerProfileId?: string): Promise<boolean> {
  if (!trainerProfileId) return false;
  const t = await prisma.trainerProfile.findUnique({
    where: { id: trainerProfileId },
    select: { leadTrainerId: true },
  });
  return Boolean(t?.leadTrainerId);
}

export { DEFAULT_PLATFORM_FEE_BPS };
