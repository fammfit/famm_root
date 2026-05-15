import type Stripe from "stripe";
import { prisma } from "@famm/db";
import { getStripeClient } from "./client";

export async function createConnectAccount(params: {
  email: string;
  country?: string;
  businessType?: "individual" | "company";
  metadata?: Record<string, string>;
}): Promise<string> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    email: params.email,
    country: params.country ?? "US",
    business_type: params.businessType ?? "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: params.metadata ?? {},
  });
  return account.id;
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripeClient();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export async function createDashboardLoginLink(accountId: string): Promise<string> {
  const stripe = getStripeClient();
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

export interface ConnectAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: Stripe.Account.Requirements | null;
}

export async function getConnectAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
  const stripe = getStripeClient();
  const acc = await stripe.accounts.retrieve(accountId);
  return {
    accountId,
    chargesEnabled: acc.charges_enabled,
    payoutsEnabled: acc.payouts_enabled,
    detailsSubmitted: acc.details_submitted,
    requirements: acc.requirements ?? null,
  };
}

/**
 * Refresh a TrainerProfile.onboarded flag against the live Stripe state.
 */
export async function syncTrainerConnectStatus(
  trainerProfileId: string
): Promise<ConnectAccountStatus | null> {
  const profile = await prisma.trainerProfile.findUnique({
    where: { id: trainerProfileId },
    select: { stripeConnectAccountId: true },
  });
  if (!profile?.stripeConnectAccountId) return null;
  const status = await getConnectAccountStatus(profile.stripeConnectAccountId);
  await prisma.trainerProfile.update({
    where: { id: trainerProfileId },
    data: { stripeConnectOnboarded: status.chargesEnabled && status.payoutsEnabled },
  });
  return status;
}

export async function createPaymentIntent(params: {
  /** Amount in MINOR units (cents). */
  amount: number;
  currency: string;
  customerId?: string;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripeClient();

  const intent = await stripe.paymentIntents.create(
    {
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      ...(params.customerId ? { customer: params.customerId } : {}),
      ...(params.connectedAccountId
        ? {
            transfer_data: { destination: params.connectedAccountId },
            ...(params.applicationFeeAmount != null
              ? { application_fee_amount: params.applicationFeeAmount }
              : {}),
          }
        : {}),
      metadata: params.metadata ?? {},
      automatic_payment_methods: { enabled: true },
    },
    params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined
  );

  if (!intent.client_secret) throw new Error("No client secret returned");

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  };
}
