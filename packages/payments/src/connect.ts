import { getStripeClient } from "./client";

export async function createConnectAccount(params: {
  email: string;
  country?: string;
  businessType?: "individual" | "company";
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

export async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  customerId?: string;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
  metadata?: Record<string, string>;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripeClient();

  const intent = await stripe.paymentIntents.create(
    {
      amount: Math.round(params.amount * 100),
      currency: params.currency.toLowerCase(),
      ...(params.customerId ? { customer: params.customerId } : {}),
      ...(params.applicationFeeAmount
        ? { application_fee_amount: Math.round(params.applicationFeeAmount * 100) }
        : {}),
      metadata: params.metadata ?? {},
      automatic_payment_methods: { enabled: true },
    },
    params.connectedAccountId
      ? { stripeAccount: params.connectedAccountId }
      : {}
  );

  if (!intent.client_secret) throw new Error("No client secret returned");

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  };
}
