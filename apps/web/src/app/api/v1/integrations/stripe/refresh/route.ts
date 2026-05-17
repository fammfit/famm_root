/**
 * POST /api/v1/integrations/stripe/refresh
 *
 * STUB. First refresh after connect advances the account to fully
 * active (charges + payouts enabled, requirements cleared, bank
 * ••4242, daily payouts). Real impl calls `stripe.accounts.retrieve`.
 *
 * TODO(stripe-connect): swap for @famm/payments.refreshAccount.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { refreshStripeAccount } from "@/lib/integrations/mock-stripe";
import { getBundle } from "@/lib/business/mock-tenant-store";

const READ_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!READ_ROLES.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Payments are for tenant owners", 403);
    }
    const currency = getBundle(ctx.tenantId).tenant.currency || "USD";
    const next = refreshStripeAccount(ctx.tenantId, currency);
    if (!next) {
      return apiError("NOT_CONNECTED", "Connect Stripe before refreshing", 409);
    }
    return apiSuccess({ account: next.account });
  } catch (err) {
    return handleError(err);
  }
}
