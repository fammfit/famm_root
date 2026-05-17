/**
 * GET    /api/v1/integrations/stripe — status + Stripe account snapshot
 * DELETE /api/v1/integrations/stripe — disconnect (owner only)
 *
 * STUB. Backed by the in-memory mock-stripe store.
 * TODO(integration-model): wire to Prisma Integration + the real Stripe
 * accounts.retrieve / OAuth deauthorize calls in @famm/payments.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { disconnectStripe, getStripeBundle } from "@/lib/integrations/mock-stripe";

const READ_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);
const WRITE_ROLES = new Set(["TENANT_OWNER", "SUPER_ADMIN"]);

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!READ_ROLES.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Payments are for tenant owners", 403);
    }
    const bundle = getStripeBundle(ctx.tenantId);
    return apiSuccess({
      integration: bundle?.integration ?? null,
      account: bundle?.account ?? null,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!WRITE_ROLES.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Only the owner can disconnect payments", 403);
    }
    disconnectStripe(ctx.tenantId);
    return apiSuccess({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
