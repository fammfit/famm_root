"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { ONBOARDING_STEPS, stepHref } from "@/lib/onboarding/steps";
import type { OnboardingStepDef, StepSlug } from "@/lib/onboarding/types";

export interface OnboardingStepProgressProps {
  currentSlug: StepSlug;
  completedSlugs: ReadonlyArray<StepSlug>;
  skippedSlugs: ReadonlyArray<StepSlug>;
}

type DotState = "completed" | "current" | "skipped" | "upcoming";

function dotState(
  step: OnboardingStepDef,
  current: StepSlug,
  completed: ReadonlyArray<StepSlug>,
  skipped: ReadonlyArray<StepSlug>
): DotState {
  if (step.slug === current) return "current";
  if (completed.includes(step.slug)) return "completed";
  if (skipped.includes(step.slug)) return "skipped";
  return "upcoming";
}

export function OnboardingStepProgress({
  currentSlug,
  completedSlugs,
  skippedSlugs,
}: OnboardingStepProgressProps) {
  const currentStep = ONBOARDING_STEPS.find((s) => s.slug === currentSlug);
  return (
    <nav
      aria-label="Onboarding steps"
      className="sticky top-14 z-20 border-b border-border bg-surface"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-stack-xs px-inset-md py-stack-xs">
        <ol className="flex items-center gap-inline-xs">
          {ONBOARDING_STEPS.map((step, i) => {
            const state = dotState(step, currentSlug, completedSlugs, skippedSlugs);
            const reachable = state !== "upcoming";
            return (
              <React.Fragment key={step.slug}>
                <li>
                  <Dot step={step} state={state} reachable={reachable} />
                </li>
                {i < ONBOARDING_STEPS.length - 1 ? (
                  <li aria-hidden="true" className="h-px flex-1 bg-border" />
                ) : null}
              </React.Fragment>
            );
          })}
        </ol>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Step {currentStep?.index ?? 1} of {ONBOARDING_STEPS.length} ·{" "}
          <span className="normal-case tracking-normal text-text-secondary">
            {currentStep?.title}
          </span>
        </p>
      </div>
    </nav>
  );
}

function Dot({
  step,
  state,
  reachable,
}: {
  step: OnboardingStepDef;
  state: DotState;
  reachable: boolean;
}) {
  const label = `Step ${step.index} of ${ONBOARDING_STEPS.length}, ${step.title}`;
  const tone =
    state === "completed"
      ? "bg-accent text-onAccent border-transparent"
      : state === "current"
        ? "bg-accent text-onAccent border-transparent"
        : state === "skipped"
          ? "border-signal-warning text-signal-warning"
          : "border-border text-text-muted";
  const ariaCurrent = state === "current" ? "step" : undefined;
  const Content = (
    <span
      aria-label={label}
      aria-current={ariaCurrent}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-pill border text-xs font-semibold",
        tone,
        state === "current" && "ring-2 ring-accent/30 ring-offset-2 ring-offset-surface"
      )}
    >
      {state === "completed" ? <Check aria-hidden className="h-3 w-3" /> : step.index}
      <span className="sr-only">
        {state === "completed"
          ? "completed"
          : state === "current"
            ? "current"
            : state === "skipped"
              ? "skipped"
              : "upcoming"}
      </span>
    </span>
  );

  if (reachable && state !== "current") {
    return (
      <Link
        href={stepHref(step.slug)}
        className="inline-flex rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        {Content}
      </Link>
    );
  }
  return <span tabIndex={-1}>{Content}</span>;
}
