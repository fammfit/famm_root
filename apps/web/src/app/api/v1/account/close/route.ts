/**
 * POST /api/v1/account/close — typed-confirmation account closure.
 *
 * STUB: marks the tenant closed in the in-memory store. Real impl runs
 * preconditions (no future bookings, zero Stripe balance, no open
 * disputes) and schedules a soft-delete.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { closeAccount } from "@/lib/account/mock-account-store";
import { getBundle } from "@/lib/business/mock-tenant-store";
import { ok, error, resolveCtx, requireOwner } from "@/lib/account/route-helpers";

const BodySchema = z.object({
  confirmation: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireOwner(ctxOrRes);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body", 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Confirmation required", 422);
  }
  const bundle = getBundle(ctxOrRes.tenantId);
  const expected = bundle.tenant.name?.trim() ?? "";
  if (!expected || parsed.data.confirmation.trim() !== expected) {
    return error("CONFIRMATION_MISMATCH", "Type your business name exactly to confirm", 422);
  }
  const result = closeAccount(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail);
  return ok(result);
}
