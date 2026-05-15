import Stripe from "stripe";
import { getStripeClient } from "./client";

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export type StripeEventType =
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed"
  | "account.updated";

type StripeEventHandler<T extends Stripe.Event["type"]> = (
  event: Stripe.Event & { type: T }
) => Promise<void>;

export class WebhookRouter {
  private handlers = new Map<string, StripeEventHandler<Stripe.Event["type"]>>();

  on<T extends Stripe.Event["type"]>(
    eventType: T,
    handler: StripeEventHandler<T>
  ): this {
    this.handlers.set(eventType, handler as StripeEventHandler<Stripe.Event["type"]>);
    return this;
  }

  async handle(event: Stripe.Event): Promise<void> {
    const handler = this.handlers.get(event.type);
    if (handler) {
      await handler(event);
    }
  }
}
