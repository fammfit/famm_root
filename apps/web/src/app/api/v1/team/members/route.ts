/**
 * GET  /api/v1/team/members — list teammates for this tenant
 * POST /api/v1/team/members — invite a new teammate
 *
 * STUB: in-memory store. Real impl reads/writes Membership + sends invite.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inviteTeammate, listTeam } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireOwner, requireAdmin } from "@/lib/account/route-helpers";

const InviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60),
  role: z.enum(["TENANT_ADMIN", "TRAINER_LEAD", "TRAINER"]),
});

export async function GET() {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;
  const members = listTeam(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail);
  return ok({ members });
}

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
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Invalid invite", 422);
  }
  const teammate = inviteTeammate(
    ctxOrRes.tenantId,
    ctxOrRes.userId,
    ctxOrRes.userEmail,
    parsed.data
  );
  return ok({ teammate });
}
