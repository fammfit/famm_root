import { type NextRequest, NextResponse } from "next/server";
import { revokeSession, revokeAllUserSessions } from "@/lib/auth/session";
import { apiSuccess, handleError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext } from "@/lib/rbac/access-control";

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const revokeAll = searchParams.get("all") === "true";

    if (revokeAll) {
      const count = await revokeAllUserSessions(ctx.userId, ctx.sessionId);
      writeAuditLog({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        action: "auth.logout.all",
        resource: "Session",
        metadata: { revokedCount: count },
        ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      });
    } else {
      await revokeSession(ctx.sessionId, "logout");
      writeAuditLog({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        action: "auth.logout",
        resource: "Session",
        resourceId: ctx.sessionId,
      });
    }

    const response = NextResponse.json(apiSuccess({ loggedOut: true }).body ?? { success: true, data: { loggedOut: true } });
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return apiSuccess({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
