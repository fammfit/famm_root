/**
 * POST /api/v1/account/security/revoke-others — revoke every active
 * session for this user *except* the one making the request. STUB.
 */
import { NextResponse } from "next/server";
import { revokeOtherSessions } from "@/lib/account/mock-account-store";
import { ok, resolveCtx, requireAdmin } from "@/lib/account/route-helpers";

export async function POST() {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;
  const sessions = revokeOtherSessions(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail);
  return ok({ sessions });
}
