/**
 * @page Onboarding Step 2 — Import Business from Google or manual entry
 *   (/trainer/onboarding/trainer-onboarding-flow/import-business)
 *
 * Purpose: optional shortcut to prefill step 3 by importing the
 *   trainer's Google Business Profile. Two outcomes — both fine: import
 *   from Google, or skip and enter business details manually next.
 * Primary user: TENANT_OWNER / TENANT_ADMIN.
 * Core actions: Connect Google, pick a listing, confirm with "Use this",
 *   or Skip. Disconnect available when connected.
 * UI sections: spec hint (sub), GoogleConnectCard, optional error banner,
 *   BusinessListingPicker (when connected), BusinessListingPreview (when
 *   a listing is picked).
 * Empty state: connected but 0 listings -> EmptyState inside the picker.
 * Loading state: skeleton rows for listings while fetching.
 * Error state: ErrorState below the connect card on listing-fetch
 *   failure; inline alert above the connect card on connect failure.
 * Mobile layout: single column; shell sticky footer carries Back/Skip/
 *   Continue. No bottom-tab nav.
 * Required data: Integration row keyed by tenantId (stubbed in memory);
 *   GoogleBusinessListing[] returned from the stub listings endpoint.
 * Related components: GoogleConnectCard, BusinessListingPicker,
 *   BusinessListingCard, BusinessListingPreview, Sheet, ErrorState.
 * Route: /trainer/onboarding/trainer-onboarding-flow/import-business
 *   (trainer-only — gated by the (onboarding) route group).
 */

import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { getStep } from "@/lib/onboarding/steps";
import { ImportBusinessStep } from "./import-business-step";
import { getRequestContext } from "@/lib/request-context";
import { getIntegration } from "@/lib/integrations/mock-google-business";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bring your business in — FAMM",
};

interface PageProps {
  searchParams?: Record<string, string | undefined>;
}

export default function ImportBusinessPage({ searchParams }: PageProps) {
  const ctx = getRequestContext();
  const step = getStep("import-business");
  const initialIntegration = getIntegration(ctx.tenantId);
  const googleReturnReason =
    searchParams?.google === "error" ? (searchParams.reason ?? "api_error") : null;

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
      <ImportBusinessStep
        initialIntegration={initialIntegration}
        googleReturnReason={googleReturnReason}
      />
    </OnboardingStepBody>
  );
}
