import { type NextRequest } from "next/server";
import { getAuthContext, assertPermission } from "@/lib/rbac/access-control";
import { getAuditLogs, assertMembership } from "@/lib/tenant/query-helpers";
import { apiSuccess, handleError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tenantId } = await params;
    const ctx = getAuthContext(request);

    assertPermission(ctx, "audit:read");
    await assertMembership(ctx.userId, tenantId);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const userId = searchParams.get("userId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

    const result = await getAuditLogs(tenantId, { page, limit, userId, action, from, to });

    return apiSuccess(result);
  } catch (err) {
    return handleError(err);
  }
}
