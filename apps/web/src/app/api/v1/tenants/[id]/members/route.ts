import { type NextRequest } from "next/server";
import { getAuthContext, assertPermission } from "@/lib/rbac/access-control";
import { getTenantMembers, assertMembership } from "@/lib/tenant/query-helpers";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tenantId } = await params;
    const ctx = getAuthContext(request);

    await assertMembership(ctx.userId, tenantId);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const role = searchParams.get("role") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const result = await getTenantMembers(tenantId, { page, limit, role: role as never, search });

    return apiSuccess(result);
  } catch (err) {
    return handleError(err);
  }
}
