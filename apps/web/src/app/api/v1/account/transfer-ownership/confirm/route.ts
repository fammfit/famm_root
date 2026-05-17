/**
 * POST /api/v1/account/transfer-ownership/confirm
 *
 * STUB: accepts any 6-digit code. Real impl validates against the SMS
 * code stored with the ticket.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmTransfer } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireOwner } from "@/lib/account/route-helpers";

const BodySchema = z.object({
  ticketId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
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
    return error("VALIDATION_ERROR", "Enter the 6-digit code", 422);
  }
  const result = confirmTransfer(
    ctxOrRes.tenantId,
    ctxOrRes.userId,
    ctxOrRes.userEmail,
    parsed.data.ticketId,
    parsed.data.code
  );
  if (!result) return error("INVALID_CODE", "That code didn't match", 422);
  return ok(result);
}
