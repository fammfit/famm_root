import { type NextRequest } from "next/server";
import { listUserSessions, revokeSession } from "@/lib/auth/session";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const sessions = await listUserSessions(ctx.userId, ctx.tenantId);
    return apiSuccess(
      sessions.map((s) => ({
        sessionId: s.sessionId,
        authMethod: s.authMethod,
        deviceName: s.deviceName,
        ipAddress: s.ipAddress,
        isCurrent: s.sessionId === ctx.sessionId,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }))
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const targetSessionId = searchParams.get("sessionId");

    if (!targetSessionId) {
      return apiError("VALIDATION_ERROR", "sessionId query param required", 400);
    }

    // Users can only revoke their own sessions; admins can revoke tenant sessions
    const sessions = await listUserSessions(ctx.userId);
    const isOwn = sessions.some((s) => s.sessionId === targetSessionId);

    if (!isOwn && ctx.userRole !== "TENANT_ADMIN" && ctx.userRole !== "TENANT_OWNER" && ctx.userRole !== "SUPER_ADMIN") {
      return apiError("FORBIDDEN", "Cannot revoke another user's session", 403);
    }

    await revokeSession(targetSessionId, "admin_revoked");

    writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "auth.session.revoked",
      resource: "Session",
      resourceId: targetSessionId,
    });

    return apiSuccess({ revoked: true });
  } catch (err) {
    return handleError(err);
  }
}
