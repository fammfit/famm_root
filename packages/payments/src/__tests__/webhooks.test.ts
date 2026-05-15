import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stripeWebhookEvent: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@famm/db", () => ({
  prisma: { stripeWebhookEvent: mocks.stripeWebhookEvent },
}));

vi.mock("../client", () => ({
  getStripeClient: () => ({ webhooks: { constructEvent: vi.fn() } }),
}));

import { WebhookRouter } from "../webhooks";

function makeEvent(id: string, type: string): Stripe.Event {
  return {
    id,
    type,
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    data: { object: {} },
    livemode: false,
    object: "event",
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as unknown as Stripe.Event;
}

describe("WebhookRouter", () => {
  beforeEach(() => {
    mocks.stripeWebhookEvent.findUnique.mockReset();
    mocks.stripeWebhookEvent.upsert.mockReset();
    mocks.stripeWebhookEvent.update.mockReset();
  });

  it("dispatches to a registered handler exactly once", async () => {
    mocks.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    mocks.stripeWebhookEvent.upsert.mockResolvedValue({});
    mocks.stripeWebhookEvent.update.mockResolvedValue({});

    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on("payment_intent.succeeded", handler);

    const event = makeEvent("evt_1", "payment_intent.succeeded");
    const result = await router.handle(event);
    expect(result).toBe("processed");
    expect(handler).toHaveBeenCalledOnce();
    expect(mocks.stripeWebhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "evt_1" } })
    );
  });

  it("skips duplicates already marked processed", async () => {
    mocks.stripeWebhookEvent.findUnique.mockResolvedValue({ processedAt: new Date() });
    const router = new WebhookRouter();
    const handler = vi.fn();
    router.on("payment_intent.succeeded", handler);
    const result = await router.handle(makeEvent("evt_dup", "payment_intent.succeeded"));
    expect(result).toBe("duplicate");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 'unhandled' but still records the event", async () => {
    mocks.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    mocks.stripeWebhookEvent.upsert.mockResolvedValue({});
    mocks.stripeWebhookEvent.update.mockResolvedValue({});

    const router = new WebhookRouter();
    const result = await router.handle(makeEvent("evt_unh", "customer.created"));
    expect(result).toBe("unhandled");
    expect(mocks.stripeWebhookEvent.upsert).toHaveBeenCalledOnce();
  });

  it("marks failures and rethrows so Stripe retries", async () => {
    mocks.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    mocks.stripeWebhookEvent.upsert.mockResolvedValue({});
    mocks.stripeWebhookEvent.update.mockResolvedValue({});

    const router = new WebhookRouter();
    router.on("payment_intent.succeeded", async () => {
      throw new Error("downstream blew up");
    });

    await expect(router.handle(makeEvent("evt_fail", "payment_intent.succeeded"))).rejects.toThrow(
      "downstream blew up"
    );

    expect(mocks.stripeWebhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_fail" },
        data: expect.objectContaining({ errorMessage: "downstream blew up" }),
      })
    );
  });
});
