"use client";

import * as React from "react";
import { Card } from "@famm/ui";
import { useOnboardingStep } from "@/lib/onboarding/context";
import type { StepSlug } from "@/lib/onboarding/types";

/**
 * Placeholder body shown for any step slug that hasn't been built yet.
 * Registers a no-op submit handler so the shell's Continue advances the
 * flow. Each step's real body will replace this in its own PR.
 */
export function StepStubBody({ slug, title }: { slug: StepSlug; title: string }) {
  useOnboardingStep(slug, {
    onContinue: async () => true,
  });
  return (
    <Card className="p-inset-md">
      <p className="text-sm text-text-secondary">
        <strong className="text-text-primary">{title}</strong> — coming soon. Tap <em>Continue</em>{" "}
        to skip ahead while we build this step.
      </p>
    </Card>
  );
}
