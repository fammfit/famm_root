/**
 * GET /api/v1/integrations/stripe/return?ok=1|0&reason=...
 *
 * STUB. The redirect target Stripe sends the trainer back to after the
 * Express onboarding flow. In the v1 stub the page itself redirects
 * here (one hop, no Stripe roundtrip) so the state machine can be
 * exercised end-to-end without external dependencies.
 *
 * Marks the connect as "submitted" (ok=1) or leaves it pending
 * (ok=0), then 302s back to the onboarding step with a query param
 * the UI consumes for the inline banner.
 *
 * TODO(stripe-connect): the real Stripe AccountLink lands here from
 * Stripe; this handler then calls accounts.retrieve and routes
 * accordingly.
 */
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { markConnectReturn } from "@/lib/integrations/mock-stripe";

const STEP_PATH = "/trainer/onboarding/trainer-onboarding-flow/connect-payments";

function resolveAppUrl(): string {
  return process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const url = new URL(request.url);
    const ok = url.searchParams.get("ok");
    const reason = url.searchParams.get("reason") ?? "cancelled";
    const outcome = ok === "1" ? "ok" : "cancel";
    markConnectReturn(ctx.tenantId, outcome);
    const redirect = new URL(STEP_PATH, resolveAppUrl());
    if (outcome === "ok") {
      redirect.searchParams.set("stripe", "connected");
    } else {
      redirect.searchParams.set("stripe", "incomplete");
      redirect.searchParams.set("reason", reason);
    }
    return NextResponse.redirect(redirect);
  } catch {
    const redirect = new URL(STEP_PATH, resolveAppUrl());
    redirect.searchParams.set("stripe", "incomplete");
    redirect.searchParams.set("reason", "auth_lost");
    return NextResponse.redirect(redirect);
  }
}
