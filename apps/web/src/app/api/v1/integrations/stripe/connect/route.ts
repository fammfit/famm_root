/**
 * POST /api/v1/integrations/stripe/connect
 *
 * STUB. Returns an `AccountLink`-shaped URL the trainer should be
 * redirected to. Real impl issues a Stripe AccountLink with
 * `type: "account_onboarding"` (or `account_update` to resume).
 *
 * Returns `{ url: "/api/v1/integrations/stripe/return?ok=1" }` so the
 * v1 stub can complete the full A->B->C journey without a real Stripe
 * account. Real implementation swaps the URL for a Stripe-hosted one.
 *
 * Owner-only — admins see a tooltip on the UI; the server enforces it.
 *
 * TODO(stripe-connect): replace with @famm/payments.createOnboardingLink.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { startStripeConnect } from "@/lib/integrations/mock-stripe";
import { getBundle } from "@/lib/business/mock-tenant-store";

const WRITE_ROLES = new Set(["TENANT_OWNER", "SUPER_ADMIN"]);

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!WRITE_ROLES.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Only the owner can connect payments", 403);
    }
    const tenant = getBundle(ctx.tenantId).tenant;
    const currency = tenant.currency || "USD";
    startStripeConnect(ctx.tenantId, currency);
    return apiSuccess({
      url: "/api/v1/integrations/stripe/return?ok=1",
    });
  } catch (err) {
    return handleError(err);
  }
}
