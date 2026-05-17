/**
 * GET  /api/v1/account/security  — snapshot of MFA + password + sessions
 * PATCH /api/v1/account/security  — toggle MFA / record password change
 *
 * STUB: in-memory store. The real implementation reads from the User row
 * and the session table.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSecurity, listSessions, updateSecurity } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireAdmin } from "@/lib/account/route-helpers";

const PatchSchema = z.object({
  mfaMethod: z.enum(["none", "sms", "totp"]).optional(),
});

export async function GET() {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;
  const security = getSecurity(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail);
  const sessions = listSessions(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail);
  return ok({ security, sessions });
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

  const security = updateSecurity(
    ctxOrRes.tenantId,
    ctxOrRes.userId,
    ctxOrRes.userEmail,
    parsed.data
  );
  return ok({ security });
}
