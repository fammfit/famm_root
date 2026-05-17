/**
 * @page Trainer Onboarding Flow — resolver (/trainer/onboarding/trainer-onboarding-flow)
 *
 * Purpose: route the trainer to whichever step they should be on. Never renders.
 * Primary user: TENANT_OWNER / TENANT_ADMIN.
 * Behavior:
 *   - If completedAt is set → /dashboard?onboarding=done (success toast key).
 *   - Else → /<currentStep>.
 * Route: /trainer/onboarding/trainer-onboarding-flow.
 */

import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/request-context";
import { getOrCreateProgress } from "@/lib/onboarding/mock-progress";
import { stepHref } from "@/lib/onboarding/steps";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Setup — FAMM",
};

export default function OnboardingResolverPage() {
  const ctx = getRequestContext();
  const progress = getOrCreateProgress(ctx.tenantId, ctx.userId);
  if (progress.completedAt || progress.currentStep === "done") {
    redirect("/dashboard?onboarding=done");
  }
  redirect(stepHref(progress.currentStep));
}
