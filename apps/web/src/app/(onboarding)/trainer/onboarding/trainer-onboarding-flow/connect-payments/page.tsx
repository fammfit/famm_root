/**
 * @page Onboarding Step 6 — Connect Payments
 *   (/trainer/onboarding/trainer-onboarding-flow/connect-payments)
 *
 * Purpose: optional Stripe Connect (Express) setup so the trainer can
 *   take card payments at booking and receive payouts to their bank.
 * Primary user: TENANT_OWNER (write); TENANT_ADMIN read-only.
 * Core actions: Set up payments → Stripe Express onboarding → return.
 *   Refresh status (catches webhook-driven changes). Disconnect. Skip.
 * UI sections: PaymentProcessorCard (Stripe), Square placeholder,
 *   skip-consequence callout (state A), CapabilityChecklist (B/C),
 *   RequirementsList (B), PayoutSummary + FeesNote (C). Disconnect
 *   Sheet.
 * Empty state: n/a — three deterministic states.
 * Loading state: skeleton for capabilities while refresh is in flight.
 * Error state: ErrorState on status fetch failure; inline banner for
 *   OAuth-return failures with per-reason copy.
 * Mobile layout: single column; shell sticky footer carries Back /
 *   Skip / Continue. Continue requires a connection (B or C).
 * Required data: Integration row keyed by (tenantId, "stripe"),
 *   StripeAccountStatus from the stub `/refresh` endpoint.
 * Related components: PaymentProcessorCard, CapabilityChecklist,
 *   RequirementsList, PayoutSummary.
 * Route: /trainer/onboarding/trainer-onboarding-flow/connect-payments
 *   (trainer-only — gated by the (onboarding) route group).
 */

import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { getStep } from "@/lib/onboarding/steps";
import { getRequestContext } from "@/lib/request-context";
import { getStripeBundle } from "@/lib/integrations/mock-stripe";
import { ConnectPaymentsStep } from "./connect-payments-step";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Take payments — FAMM",
};

interface PageProps {
  searchParams?: Record<string, string | undefined>;
}

export default function ConnectPaymentsPage({ searchParams }: PageProps) {
  const ctx = getRequestContext();
  const step = getStep("connect-payments");
  const bundle = getStripeBundle(ctx.tenantId);
  const initialStatus = {
    integration: bundle?.integration ?? null,
    account: bundle?.account ?? null,
  };
  const initialReason =
    searchParams?.stripe === "incomplete" ? (searchParams.reason ?? "cancelled") : null;
  const isOwner = ctx.userRole === "TENANT_OWNER" || ctx.userRole === "SUPER_ADMIN";
  return (
    <OnboardingStepBody>
      <header className="flex flex-col gap-stack-xs">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Step {step.index} of 7
        </p>
        <h1 tabIndex={-1} className="text-2xl font-semibold text-text-primary md:text-3xl">
          {step.title}
        </h1>
      </header>
      <ConnectPaymentsStep
        initialStatus={initialStatus}
        initialReason={initialReason}
        isOwner={isOwner}
      />
    </OnboardingStepBody>
  );
}
