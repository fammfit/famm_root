/**
 * @page Onboarding step host (/trainer/onboarding/trainer-onboarding-flow/[slug])
 *
 * Purpose: generic host for one of the 7 onboarding steps. Validates the
 *   slug, renders the step title + a placeholder "Coming soon" body, and
 *   registers a no-op submit handler with OnboardingContext so the
 *   shell's Continue button still advances the flow during the stub
 *   phase. Each real step body will be added in its own follow-up PR
 *   under the same route by replacing the StepStubBody below.
 * Primary user: TENANT_OWNER / TENANT_ADMIN.
 * Loading state: loading.tsx (sibling).
 * Error state: error.tsx (sibling).
 * Route: /trainer/onboarding/trainer-onboarding-flow/[slug].
 */

import { notFound } from "next/navigation";
import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { StepStubBody } from "./step-stub-body";
import { getStep, isStepSlug } from "@/lib/onboarding/steps";

interface PageProps {
  params: { slug: string };
}

export default function OnboardingStepPage({ params }: PageProps) {
  if (!isStepSlug(params.slug)) {
    notFound();
  }
  const step = getStep(params.slug);
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
      <StepStubBody slug={step.slug} title={step.title} />
    </OnboardingStepBody>
  );
}
