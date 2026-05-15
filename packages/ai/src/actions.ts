import { z } from "zod";
import { prisma } from "@famm/db";
import type OpenAI from "openai";
import type { AiToolCall, AiToolResult, ConversationActor } from "./types";

/**
 * Structured action / tool definitions.
 *
 * Each action declares (1) a Zod schema for its arguments, (2) a JSON Schema
 * for OpenAI function-calling, and (3) a handler that runs server-side under
 * the authenticated user's identity. Handlers MUST honor tenantId and userId
 * from the actor; the model cannot override these.
 */

export interface ActionContext {
  actor: ConversationActor;
  /** Optional escape hatch for callers (e.g. payments service injection). */
  paymentsClient?: PaymentsClient;
  /** Optional event publisher for workflow triggers. */
  publishEvent?: (event: WorkflowEvent) => Promise<void>;
}

export interface PaymentsClient {
  createCheckoutSession(input: {
    tenantId: string;
    bookingId?: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    lineItems: Array<{
      adhoc: { name: string; amount: number; currency: string };
      quantity: number;
    }>;
    idempotencyKey: string;
  }): Promise<{ url: string; id: string }>;
}

export interface WorkflowEvent {
  tenantId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const createBooking = z.object({
  serviceId: z.string().min(1),
  trainerId: z.string().optional(),
  startAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

const rescheduleBooking = z.object({
  bookingId: z.string().min(1),
  newStartAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

const recommendTrainers = z.object({
  serviceId: z.string().optional(),
  preferences: z.string().max(500).optional(),
  limit: z.number().int().min(1).max(10).default(3),
});

const generatePaymentLink = z.object({
  bookingId: z.string().optional(),
  description: z.string().max(200),
  amount: z.number().int().min(50),
  currency: z.string().length(3).default("USD"),
});

const triggerWorkflow = z.object({
  workflow: z.enum([
    "send_intake_form",
    "request_review",
    "send_welcome_pack",
    "escalate_to_human",
  ]),
  payload: z.record(z.unknown()).default({}),
});

// ── OpenAI tool definitions ──────────────────────────────────────────────────

export const OPENAI_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_booking",
      description:
        "Create a new booking for the authenticated user. Use only after confirming service, time, and (optionally) trainer.",
      parameters: {
        type: "object",
        required: ["serviceId", "startAt"],
        properties: {
          serviceId: { type: "string", description: "Service id from the catalog." },
          trainerId: { type: "string", description: "Optional trainer profile id." },
          startAt: {
            type: "string",
            description: "ISO 8601 start time in UTC.",
          },
          notes: { type: "string", description: "Optional client notes." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_booking",
      description: "Move an existing booking to a new time. Only the booking's owner can reschedule.",
      parameters: {
        type: "object",
        required: ["bookingId", "newStartAt"],
        properties: {
          bookingId: { type: "string" },
          newStartAt: { type: "string", description: "ISO 8601 UTC." },
          reason: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_trainers",
      description: "Recommend trainers from this tenant's roster. Returns up to 10 candidates.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string" },
          preferences: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 10 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_payment_link",
      description: "Generate a Stripe checkout link for an ad-hoc charge or a booking.",
      parameters: {
        type: "object",
        required: ["description", "amount"],
        properties: {
          bookingId: { type: "string" },
          description: { type: "string" },
          amount: { type: "integer", description: "Amount in minor units (cents)." },
          currency: { type: "string", description: "ISO 4217 code." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_workflow",
      description: "Trigger a named backend workflow (intake, review, welcome, escalation).",
      parameters: {
        type: "object",
        required: ["workflow"],
        properties: {
          workflow: {
            type: "string",
            enum: ["send_intake_form", "request_review", "send_welcome_pack", "escalate_to_human"],
          },
          payload: { type: "object", additionalProperties: true },
        },
      },
    },
  },
];

// ── Handler dispatch ─────────────────────────────────────────────────────────

export async function executeAction(
  call: AiToolCall,
  ctx: ActionContext
): Promise<AiToolResult> {
  try {
    switch (call.name) {
      case "create_booking":
        return ok(call.id, await handleCreateBooking(createBooking.parse(call.arguments), ctx));
      case "reschedule_booking":
        return ok(
          call.id,
          await handleRescheduleBooking(rescheduleBooking.parse(call.arguments), ctx)
        );
      case "recommend_trainers":
        return ok(
          call.id,
          await handleRecommendTrainers(recommendTrainers.parse(call.arguments), ctx)
        );
      case "generate_payment_link":
        return ok(
          call.id,
          await handleGeneratePaymentLink(generatePaymentLink.parse(call.arguments), ctx)
        );
      case "trigger_workflow":
        return ok(call.id, await handleTriggerWorkflow(triggerWorkflow.parse(call.arguments), ctx));
      default:
        return fail(call.id, `Unknown tool: ${call.name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return fail(call.id, message);
  }
}

function ok(id: string, payload: unknown): AiToolResult {
  return { toolCallId: id, content: JSON.stringify(payload) };
}

function fail(id: string, message: string): AiToolResult {
  return { toolCallId: id, content: JSON.stringify({ error: message }), isError: true };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCreateBooking(
  input: z.infer<typeof createBooking>,
  ctx: ActionContext
): Promise<unknown> {
  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, tenantId: ctx.actor.tenantId },
  });
  if (!service) throw new Error("Service not found in this tenant");

  const startAt = new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  // Conflict check against the same trainer (or any trainer if unassigned).
  if (input.trainerId) {
    const trainer = await prisma.trainerProfile.findFirst({
      where: {
        id: input.trainerId,
        user: { memberships: { some: { tenantId: ctx.actor.tenantId } } },
      },
    });
    if (!trainer) throw new Error("Trainer not found in this tenant");

    const conflict = await prisma.booking.findFirst({
      where: {
        tenantId: ctx.actor.tenantId,
        trainerId: input.trainerId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (conflict) throw new Error("Selected slot is no longer available");
  }

  const booking = await prisma.booking.create({
    data: {
      tenantId: ctx.actor.tenantId,
      clientId: ctx.actor.userId,
      serviceId: input.serviceId,
      ...(input.trainerId ? { trainerId: input.trainerId } : {}),
      startAt,
      endAt,
      timezone: ctx.actor.timezone,
      price: service.basePrice,
      currency: service.currency,
      ...(input.notes ? { notes: input.notes } : {}),
      status: "PENDING",
    },
    select: { id: true, startAt: true, endAt: true, status: true, price: true, currency: true },
  });

  await ctx.publishEvent?.({
    tenantId: ctx.actor.tenantId,
    userId: ctx.actor.userId,
    type: "BOOKING_CREATED",
    payload: { bookingId: booking.id },
  });

  return booking;
}

async function handleRescheduleBooking(
  input: z.infer<typeof rescheduleBooking>,
  ctx: ActionContext
): Promise<unknown> {
  const existing = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      tenantId: ctx.actor.tenantId,
      clientId: ctx.actor.userId,
    },
    include: { service: { select: { durationMinutes: true } } },
  });
  if (!existing) throw new Error("Booking not found or not yours");
  if (existing.status === "CANCELLED" || existing.status === "COMPLETED") {
    throw new Error(`Booking is ${existing.status} and cannot be rescheduled`);
  }

  const newStart = new Date(input.newStartAt);
  const newEnd = new Date(newStart.getTime() + existing.service.durationMinutes * 60_000);

  const updated = await prisma.booking.update({
    where: { id: existing.id },
    data: {
      startAt: newStart,
      endAt: newEnd,
      status: "RESCHEDULED",
      ...(input.reason ? { cancellationReason: input.reason } : {}),
    },
    select: { id: true, startAt: true, endAt: true, status: true },
  });

  await ctx.publishEvent?.({
    tenantId: ctx.actor.tenantId,
    userId: ctx.actor.userId,
    type: "BOOKING_RESCHEDULED",
    payload: { bookingId: updated.id },
  });

  return updated;
}

async function handleRecommendTrainers(
  input: z.infer<typeof recommendTrainers>,
  ctx: ActionContext
): Promise<unknown> {
  const trainers = await prisma.trainerProfile.findMany({
    where: {
      user: {
        status: "ACTIVE",
        memberships: {
          some: {
            tenantId: ctx.actor.tenantId,
            role: { in: ["TRAINER", "TRAINER_LEAD"] },
          },
        },
      },
      ...(input.serviceId
        ? { services: { some: { serviceId: input.serviceId } } }
        : {}),
    },
    include: { user: { select: { firstName: true, lastName: true } } },
    take: input.limit,
  });

  return trainers.map((t) => ({
    id: t.id,
    name: `${t.user.firstName} ${t.user.lastName}`.trim(),
    specialties: t.specialties,
    bio: t.bio,
  }));
}

async function handleGeneratePaymentLink(
  input: z.infer<typeof generatePaymentLink>,
  ctx: ActionContext
): Promise<unknown> {
  if (!ctx.paymentsClient) {
    throw new Error("Payments client not configured");
  }

  // If a bookingId is provided, ensure it belongs to this user.
  if (input.bookingId) {
    const owns = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        tenantId: ctx.actor.tenantId,
        clientId: ctx.actor.userId,
      },
      select: { id: true },
    });
    if (!owns) throw new Error("Booking not found or not yours");
  }

  const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const session = await ctx.paymentsClient.createCheckoutSession({
    tenantId: ctx.actor.tenantId,
    ...(input.bookingId ? { bookingId: input.bookingId } : {}),
    successUrl: `${base}/payments/success`,
    cancelUrl: `${base}/payments/cancel`,
    lineItems: [
      {
        adhoc: { name: input.description, amount: input.amount, currency: input.currency },
        quantity: 1,
      },
    ],
    idempotencyKey: `ai_link_${ctx.actor.tenantId}_${ctx.actor.userId}_${Date.now()}`,
  });

  return { url: session.url, sessionId: session.id };
}

async function handleTriggerWorkflow(
  input: z.infer<typeof triggerWorkflow>,
  ctx: ActionContext
): Promise<unknown> {
  if (!ctx.publishEvent) throw new Error("Event bus not configured");
  await ctx.publishEvent({
    tenantId: ctx.actor.tenantId,
    userId: ctx.actor.userId,
    type: `WORKFLOW_${input.workflow.toUpperCase()}`,
    payload: input.payload,
  });
  return { dispatched: true, workflow: input.workflow };
}

// Exposed for tests.
export const _schemas = {
  createBooking,
  rescheduleBooking,
  recommendTrainers,
  generatePaymentLink,
  triggerWorkflow,
};
