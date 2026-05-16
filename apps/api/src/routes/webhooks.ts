import { Hono } from "hono";
import { WebhookSignatureError, buildDefaultRouter, constructWebhookEvent } from "@famm/payments";

const webhooks = new Hono();
const router = buildDefaultRouter();

/**
 * Stripe webhook endpoint.
 *
 * IMPORTANT: this route bypasses normal body parsing. The raw bytes are
 * required for HMAC verification. Mount this router OUTSIDE the
 * `/api/v1/*` auth middleware in app.ts.
 */
webhooks.post("/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: { code: "MISSING_SIGNATURE" } }, 400);
  }

  let raw: string;
  try {
    raw = await c.req.text();
  } catch {
    return c.json({ error: { code: "INVALID_BODY" } }, 400);
  }

  let event;
  try {
    event = constructWebhookEvent(raw, signature);
  } catch (err) {
    if (err instanceof WebhookSignatureError) {
      return c.json({ error: { code: "BAD_SIGNATURE" } }, 400);
    }
    throw err;
  }

  try {
    const status = await router.handle(event);
    return c.json({ received: true, status });
  } catch (err) {
    // 500 tells Stripe to retry. The event is recorded as failed in the DB.
    console.error("[webhooks] handler failed for", event.type, err);
    return c.json({ error: { code: "HANDLER_FAILED" } }, 500);
  }
});

export default webhooks;
