/**
 * PATCH  /api/v1/team/members/:id  — change role
 * DELETE /api/v1/team/members/:id  — remove teammate
 *
 * STUB: in-memory store.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { removeTeammate, updateTeammateRole } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireOwner } from "@/lib/account/route-helpers";

const RoleSchema = z.object({
  role: z.enum(["TENANT_ADMIN", "TRAINER_LEAD", "TRAINER"]),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireOwner(ctxOrRes);
  if (forbidden) return forbidden;
  if (params.id === ctxOrRes.userId) {
    return error("FORBIDDEN", "Use Transfer ownership to change your own role", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body", 400);
  }
  const parsed = RoleSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Invalid role", 422);
  }
  const updated = updateTeammateRole(
    ctxOrRes.tenantId,
    ctxOrRes.userId,
    ctxOrRes.userEmail,
    params.id,
    parsed.data.role
  );
  if (!updated) return error("NOT_FOUND", "Teammate not found", 404);
  return ok({ teammate: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireOwner(ctxOrRes);
  if (forbidden) return forbidden;
  if (params.id === ctxOrRes.userId) {
    return error("FORBIDDEN", "You can't remove yourself", 403);
  }
  const removed = removeTeammate(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail, params.id);
  if (!removed) return error("NOT_FOUND", "Teammate not found", 404);
  return ok({ removed: true });
}
