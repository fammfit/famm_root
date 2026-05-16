"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sheet, SheetHeader, SheetFooter, Button } from "@famm/ui";
import { OnboardingAppBar } from "@/components/onboarding/OnboardingAppBar";
import { OnboardingStepProgress } from "@/components/onboarding/OnboardingStepProgress";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { OnboardingResumeBanner } from "@/components/onboarding/OnboardingResumeBanner";
import { OnboardingHelpSheet } from "@/components/onboarding/OnboardingHelpSheet";
import { OnboardingStepProvider, useOnboardingStepContext } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import {
  STEP_BASE_PATH,
  getStep,
  isStepSlug,
  nextStep,
  previousStep,
  stepHref,
} from "@/lib/onboarding/steps";
import type { OnboardingProgress, StepSlug } from "@/lib/onboarding/types";
import { trackEvent } from "@/lib/api/events";

interface OnboardingShellProps {
  initialProgress: OnboardingProgress;
  /** Server-resolved actor role. Restart is gated by this. */
  canRestart: boolean;
  children: React.ReactNode;
}

/**
 * Top-level shell for the trainer onboarding flow. Renders the app bar,
 * the 7-dot progress indicator, the body slot, and the sticky footer.
 *
 * The shell owns "what step are we on?" by reading the URL via
 * usePathname() — the step pages are dumb beyond their own form state.
 */
export function OnboardingShell({ initialProgress, canRestart, children }: OnboardingShellProps) {
  return (
    <OnboardingStepProvider>
      <OnboardingShellInner initialProgress={initialProgress} canRestart={canRestart}>
        {children}
      </OnboardingShellInner>
    </OnboardingStepProvider>
  );
}

function slugFromPath(pathname: string | null): StepSlug | null {
  if (!pathname) return null;
  const tail = pathname.replace(`${STEP_BASE_PATH}/`, "").replace(/^\//, "");
  return isStepSlug(tail) ? tail : null;
}

function OnboardingShellInner({ initialProgress, canRestart, children }: OnboardingShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const slug = slugFromPath(pathname);

  const { query, markComplete, markSkipped, setCurrent, complete, restart, isMutating } =
    useOnboardingProgress(initialProgress);

  const progress = query.data ?? initialProgress;
  const { state: stepState } = useOnboardingStepContext();
  const [continueLoading, setContinueLoading] = React.useState(false);

  // Sheet states.
  const [exitOpen, setExitOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [restartOpen, setRestartOpen] = React.useState(false);

  // Telemetry: emit step-viewed once per slug per mount.
  const lastViewedRef = React.useRef<StepSlug | null>(null);
  React.useEffect(() => {
    if (!slug) return;
    if (lastViewedRef.current === slug) return;
    lastViewedRef.current = slug;
    trackEvent({ name: "onboarding.step.viewed", payload: { slug } });
  }, [slug]);

  // Server-side `currentStep` chases the URL when the user jumps back to
  // a completed step or refreshes deep into the flow.
  React.useEffect(() => {
    if (!slug) return;
    if (progress.currentStep === slug) return;
    if (progress.currentStep === "done") return;
    if (progress.completedSteps.includes(slug)) return; // re-editing — leave currentStep alone
    void setCurrent(slug).catch(() => null);
  }, [slug, progress.currentStep, progress.completedSteps, setCurrent]);

  // Resume banner: shown once per session when the trainer lands mid-flow.
  const shouldShowResume = React.useMemo(() => {
    if (!slug) return false;
    if (progress.completedSteps.length === 0 && progress.skippedSteps.length === 0) return false;
    return true;
  }, [slug, progress.completedSteps, progress.skippedSteps]);

  if (!slug) {
    // Should never happen — resolver redirects to a valid slug — but render
    // safe defaults if it does.
    return null;
  }
  // Closure capture: keep the narrowed slug across async handlers.
  const currentSlug: StepSlug = slug;
  const step = getStep(currentSlug);
  const prevSlug = previousStep(currentSlug);
  const showSkip = !step.required;

  async function handleContinue() {
    setContinueLoading(true);
    try {
      const ok = stepState ? await stepState.runContinue() : true;
      if (!ok) return;
      const updated = await markComplete(currentSlug);
      trackEvent({ name: "onboarding.step.completed", payload: { slug: currentSlug } });

      if (updated.completedAt) {
        // Flow is done.
        const done = await complete();
        trackEvent({ name: "onboarding.completed" });
        router.push(done.redirectTo);
        router.refresh();
        return;
      }
      const after = nextStep(currentSlug);
      router.push(after ? stepHref(after) : "/dashboard");
    } catch {
      // Errors surface inline in the step body or via API toast; nothing
      // to do at the shell level beyond stopping the spinner.
    } finally {
      setContinueLoading(false);
    }
  }

  async function handleSkip() {
    if (step.required) return;
    setContinueLoading(true);
    try {
      await markSkipped(currentSlug);
      trackEvent({ name: "onboarding.step.skipped", payload: { slug: currentSlug } });
      const after = nextStep(currentSlug);
      router.push(after ? stepHref(after) : "/dashboard");
    } finally {
      setContinueLoading(false);
    }
  }

  function handleBack() {
    if (!prevSlug) return;
    router.push(stepHref(prevSlug));
  }

  function handleExitRequest() {
    if (stepState?.dirty) {
      setExitOpen(true);
      return;
    }
    router.push("/dashboard");
  }

  async function handleRestartConfirm() {
    setRestartOpen(false);
    await restart();
    trackEvent({ name: "onboarding.restarted" });
    router.push(stepHref("trainer-info"));
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <OnboardingAppBar onExit={handleExitRequest} onHelp={() => setHelpOpen(true)} />
      <OnboardingStepProgress
        currentSlug={currentSlug}
        completedSlugs={progress.completedSteps}
        skippedSlugs={progress.skippedSteps}
      />
      {shouldShowResume ? (
        <OnboardingResumeBanner message="Welcome back. You left off here." />
      ) : null}
      <div className="flex flex-1 flex-col">{children}</div>
      <OnboardingFooter
        {...(prevSlug ? { onBack: handleBack } : {})}
        {...(showSkip ? { onSkip: handleSkip } : {})}
        onContinue={handleContinue}
        continueLabel={stepState?.continueLabel}
        continueDisabled={stepState?.continueDisabled || isMutating}
        continueLoading={continueLoading}
      />

      <OnboardingHelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onRequestRestart={() => setRestartOpen(true)}
        canRestart={canRestart}
      />

      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} ariaLabelledBy="exit-title">
        <SheetHeader
          title="Save your changes?"
          description="You can come back at any time."
          onClose={() => setExitOpen(false)}
          titleId="exit-title"
        />
        <SheetFooter>
          <Button variant="ghost" onClick={() => setExitOpen(false)}>
            Stay
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setExitOpen(false);
              router.push("/dashboard");
            }}
          >
            Discard and exit
          </Button>
          <Button
            onClick={() => {
              setExitOpen(false);
              router.push("/dashboard");
            }}
          >
            Save and exit
          </Button>
        </SheetFooter>
      </Sheet>

      <Sheet
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        side="center"
        ariaLabelledBy="restart-title"
      >
        <SheetHeader
          title="Start over?"
          description="This clears everything you've entered so far."
          onClose={() => setRestartOpen(false)}
          titleId="restart-title"
        />
        <SheetFooter>
          <Button variant="ghost" onClick={() => setRestartOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRestartConfirm}>
            Yes, start over
          </Button>
        </SheetFooter>
      </Sheet>
    </div>
  );
}
