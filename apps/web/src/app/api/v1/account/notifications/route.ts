/**
 * GET   /api/v1/account/notifications — per-event email/sms toggles
 * PATCH /api/v1/account/notifications — overwrite the matrix
 *
 * STUB.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getNotifications, updateNotifications } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireAdmin } from "@/lib/account/route-helpers";

const EVENTS = [
  "booking.confirmed",
  "booking.reminder.24h",
  "booking.reminder.1h",
  "booking.cancelled",
  "payment.succeeded",
  "payment.failed",
] as const;

const ChannelSchema = z.object({ email: z.boolean(), sms: z.boolean() });

const PatchSchema = z.object({
  prefs: z.object(
    Object.fromEntries(EVENTS.map((e) => [e, ChannelSchema])) as Record<
      (typeof EVENTS)[number],
      typeof ChannelSchema
    >
  ),
});

export async function GET() {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;
  return ok({
    notifications: getNotifications(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail),
  });
}

export async function PATCH(request: NextRequest) {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body", 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Invalid prefs", 422);
  }
  const notifications = updateNotifications(
    ctxOrRes.tenantId,
    ctxOrRes.userId,
    ctxOrRes.userEmail,
    parsed.data.prefs
  );
  return ok({ notifications });
}
