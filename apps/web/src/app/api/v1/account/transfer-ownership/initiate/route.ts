/**
 * POST /api/v1/account/transfer-ownership/initiate
 *
 * STUB: returns a ticketId. In real life this also triggers an SMS to
 * the current owner with a 6-digit confirmation code.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTransferTicket, listTeam } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireOwner } from "@/lib/account/route-helpers";

const BodySchema = z.object({
  targetUserId: z.string().min(1),
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
    return error("VALIDATION_ERROR", "Pick a teammate", 422);
  }
  if (parsed.data.targetUserId === ctxOrRes.userId) {
    return error("VALIDATION_ERROR", "You're already the owner", 422);
  }
  const team = listTeam(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail);
  const target = team.find((m) => m.id === parsed.data.targetUserId);
  if (!target) return error("NOT_FOUND", "Teammate not found", 404);
  if (target.role !== "TENANT_ADMIN" || target.status !== "active") {
    return error(
      "VALIDATION_ERROR",
      "Promote them to admin and have them accept the invite first",
      422
    );
  }
  const ticket = createTransferTicket(
    ctxOrRes.tenantId,
    ctxOrRes.userId,
    ctxOrRes.userEmail,
    parsed.data.targetUserId
  );
  return ok(ticket);
}
