import type Stripe from "stripe";
import { prisma, type SubscriptionStatus } from "@famm/db";
import { getStripeClient } from "./client";

const STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  paused: "PAST_DUE",
};

export function mapSubscriptionStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  return STATUS_MAP[s] ?? "INCOMPLETE";
}

/**
 * Upsert a local subscription row from a Stripe subscription. Items are
 * synced in the same transaction so they never drift from the parent.
 */
export async function upsertSubscriptionFromStripe(sub: Stripe.Subscription): Promise<void> {
  const tenantId = (sub.metadata?.["tenantId"] as string | undefined) ?? null;
  if (!tenantId) {
    console.warn(`[payments] Subscription ${sub.id} missing tenantId metadata`);
    return;
  }

  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customer = await prisma.customer.findUnique({ where: { stripeCustomerId } });
  if (!customer) {
    console.warn(`[payments] Customer ${stripeCustomerId} not found for subscription ${sub.id}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const upserted = await tx.subscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      create: {
        tenantId,
        customerId: customer.id,
        stripeSubscriptionId: sub.id,
        status: mapSubscriptionStatus(sub.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        ...(sub.cancel_at ? { cancelAt: new Date(sub.cancel_at * 1000) } : {}),
        ...(sub.canceled_at ? { canceledAt: new Date(sub.canceled_at * 1000) } : {}),
        ...(sub.trial_start ? { trialStart: new Date(sub.trial_start * 1000) } : {}),
        ...(sub.trial_end ? { trialEnd: new Date(sub.trial_end * 1000) } : {}),
        collectionMethod: sub.collection_method ?? "charge_automatically",
        metadata: (sub.metadata as Record<string, string>) ?? {},
      },
      update: {
        status: mapSubscriptionStatus(sub.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        collectionMethod: sub.collection_method ?? "charge_automatically",
        metadata: (sub.metadata as Record<string, string>) ?? {},
      },
    });

    for (const item of sub.items.data) {
      const stripePriceId = item.price.id;
      const localPrice = await tx.price.findUnique({ where: { stripePriceId } });
      if (!localPrice) continue;
      await tx.subscriptionItem.upsert({
        where: { stripeSubscriptionItemId: item.id },
        create: {
          subscriptionId: upserted.id,
          priceId: localPrice.id,
          stripeSubscriptionItemId: item.id,
          quantity: item.quantity ?? 1,
        },
        update: {
          priceId: localPrice.id,
          quantity: item.quantity ?? 1,
        },
      });
    }
  });
}

export async function cancelSubscription(
  stripeSubscriptionId: string,
  opts: { atPeriodEnd?: boolean } = {}
): Promise<void> {
  const stripe = getStripeClient();
  if (opts.atPeriodEnd) {
    await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
  } else {
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  }
}

export async function resumeSubscription(stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: false });
}
