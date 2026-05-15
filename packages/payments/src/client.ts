import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripe) {
    const secretKey = process.env["STRIPE_SECRET_KEY"];
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");

    _stripe = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
      typescript: true,
      maxNetworkRetries: 3,
    });
  }
  return _stripe;
}
