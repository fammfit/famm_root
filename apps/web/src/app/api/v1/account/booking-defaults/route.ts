/**
 * GET   /api/v1/account/booking-defaults
 * PATCH /api/v1/account/booking-defaults
 *
 * STUB.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingDefaults, updateBookingDefaults } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireAdmin } from "@/lib/account/route-helpers";

const PatchSchema = z.object({
  minLeadTimeMinutes: z.number().int().min(0).max(10080).optional(),
  cancellationWindowHours: z.number().int().min(0).max(168).optional(),
  autoConfirm: z.boolean().optional(),
  noShowFee: z
    .object({
      enabled: z.boolean(),
      amountMinor: z.number().int().min(0).max(1_000_000),
      currency: z.string().length(3),
    })
    .optional(),
});

export async function GET() {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;
  return ok({
    bookingDefaults: getBookingDefaults(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail),
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
    return error("VALIDATION_ERROR", "Invalid patch", 422);
  }
  const bookingDefaults = updateBookingDefaults(
    ctxOrRes.tenantId,
    ctxOrRes.userId,
    ctxOrRes.userEmail,
    parsed.data
  );
  return ok({ bookingDefaults });
}
