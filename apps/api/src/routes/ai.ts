import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { processMessage, type PaymentsClient, type WorkflowEvent } from "@famm/ai";
import { prisma } from "@famm/db";
import { createCheckoutSession } from "@famm/payments";
import type { JwtPayload } from "@famm/types";

interface TenantCtx {
  tenantId: string;
  timezone: string;
  currency: string;
}

type Env = { Variables: { tenant: TenantCtx; user: JwtPayload } };

const ai = new Hono<Env>();

const chatBody = z.object({
  conversationId: z.string().min(1).optional(),
  message: z.string().min(1).max(4000),
});

/**
 * Workflow events triggered by the AI are persisted to the audit log so
 * downstream workers can pick them up and human reviewers can see what the
 * assistant did. We avoid publishing AI-controlled strings directly to the
 * strict-typed NATS bus; a separate promoter worker can fan out the
 * subset of events that match a known DomainEventType.
 */
async function persistWorkflowEvent(event: WorkflowEvent): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: event.tenantId,
      userId: event.userId,
      action: event.type,
      resource: "ai_workflow",
      metadata: event.payload as object,
    },
  });
}

const paymentsAdapter: PaymentsClient = {
  async createCheckoutSession(input) {
    const session = await createCheckoutSession({
      tenantId: input.tenantId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      mode: "payment",
      lineItems: input.lineItems,
      idempotencyKey: input.idempotencyKey,
      ...(input.bookingId ? { bookingId: input.bookingId } : {}),
      ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    });
    return { url: session.url, id: session.sessionId };
  },
};

function actor(c: Context<Env>) {
  const tenant = c.get("tenant");
  const user = c.get("user");
  return {
    tenantId: tenant.tenantId,
    userId: user.sub,
    timezone: tenant.timezone,
    currency: tenant.currency,
  };
}

/**
 * SSE streaming chat. The client opens a POST with the latest user message
 * and receives `data: {...StreamChunk}\n\n` frames until a `done` frame.
 */
ai.post("/chat/stream", async (c) => {
  const body = chatBody.parse(await c.req.json());
  const a = actor(c);
  const conversationId = body.conversationId ?? `web_${a.userId}_${Date.now()}`;

  return streamSSE(c, async (stream) => {
    try {
      await processMessage(
        {
          channel: "web",
          actor: a,
          sessionKey: conversationId,
          message: body.message,
          onChunk: (chunk) => {
            void stream.writeSSE({ data: JSON.stringify(chunk) });
          },
        },
        {
          paymentsClient: paymentsAdapter,
          publishEvent: persistWorkflowEvent,
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await stream.writeSSE({ data: JSON.stringify({ type: "error", error: message }) });
    } finally {
      await stream.close();
    }
  });
});

/**
 * Plain JSON one-shot — for clients that don't want streaming.
 */
ai.post("/chat", async (c) => {
  const body = chatBody.parse(await c.req.json());
  const a = actor(c);
  const conversationId = body.conversationId ?? `web_${a.userId}_${Date.now()}`;

  const result = await processMessage(
    { channel: "web", actor: a, sessionKey: conversationId, message: body.message },
    { paymentsClient: paymentsAdapter }
  );
  return c.json({ success: true, data: result });
});

/**
 * List the user's conversations (most recent first). Strictly scoped to the
 * caller's tenant and user id.
 */
ai.get("/conversations", async (c) => {
  const a = actor(c);
  const conversations = await prisma.aiConversation.findMany({
    where: { tenantId: a.tenantId, userId: a.userId },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      channel: true,
      startedAt: true,
      endedAt: true,
      summary: true,
    },
  });
  return c.json({ success: true, data: conversations });
});

ai.get("/conversations/:id/messages", async (c) => {
  const a = actor(c);
  const id = c.req.param("id");
  // Ownership check — refuse cross-user / cross-tenant access.
  const conv = await prisma.aiConversation.findFirst({
    where: { id, tenantId: a.tenantId, userId: a.userId },
    select: { id: true },
  });
  if (!conv) {
    return c.json({ success: false, error: { code: "NOT_FOUND" } }, 404);
  }
  const messages = await prisma.aiMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return c.json({ success: true, data: messages });
});

export default ai;
export { paymentsAdapter };
