import type { OnboardingProgress, ProgressPatchInput, StepSlug } from "./types";
import { isStepSlug, nextStep, requiredStepsRemaining } from "./steps";

/**
 * In-memory store keyed by tenantId. Replaces a Prisma model until the
 * OnboardingProgress table lands. Cleared on server restart — fine for
 * local dev. Re-export points are the api/v1/onboarding/* route handlers.
 */
const STORE = new Map<string, OnboardingProgress>();

export function getOrCreateProgress(tenantId: string, userId: string): OnboardingProgress {
  const existing = STORE.get(tenantId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const fresh: OnboardingProgress = {
    id: `op_${tenantId}`,
    tenantId,
    userId,
    currentStep: "trainer-info",
    completedSteps: [],
    skippedSteps: [],
    stepData: {},
    startedAt: now,
    completedAt: null,
    restartCount: 0,
    updatedAt: now,
  };
  STORE.set(tenantId, fresh);
  return fresh;
}

export function patchProgress(
  tenantId: string,
  userId: string,
  input: ProgressPatchInput
): OnboardingProgress {
  const current = getOrCreateProgress(tenantId, userId);
  const slug = input.slug;
  const now = new Date().toISOString();
  const next: OnboardingProgress = { ...current, updatedAt: now };

  if (input.action === "patch" && slug && input.stepData) {
    next.stepData = { ...next.stepData, [slug]: input.stepData };
  }

  if (input.action === "current" && slug && isStepSlug(slug)) {
    next.currentStep = slug;
  }

  if (input.action === "complete" && slug && isStepSlug(slug)) {
    if (!next.completedSteps.includes(slug)) {
      next.completedSteps = [...next.completedSteps, slug];
    }
    next.skippedSteps = next.skippedSteps.filter((s) => s !== slug);
    if (input.stepData) {
      next.stepData = { ...next.stepData, [slug]: input.stepData };
    }
    const after = nextStep(slug);
    next.currentStep = after ?? "done";
    if (requiredStepsRemaining(next.completedSteps).length === 0) {
      next.completedAt = next.completedAt ?? now;
    }
  }

  if (input.action === "skip" && slug && isStepSlug(slug)) {
    if (!next.skippedSteps.includes(slug)) {
      next.skippedSteps = [...next.skippedSteps, slug];
    }
    const after = nextStep(slug);
    next.currentStep = after ?? "done";
  }

  STORE.set(tenantId, next);
  return next;
}

export function markComplete(
  tenantId: string,
  userId: string,
  options: { override?: boolean } = {}
): OnboardingProgress {
  const current = getOrCreateProgress(tenantId, userId);
  const now = new Date().toISOString();
  const remaining = requiredStepsRemaining(current.completedSteps);
  if (remaining.length > 0 && !options.override) {
    // Not actually complete; the caller will surface the error.
    return current;
  }
  const next: OnboardingProgress = {
    ...current,
    completedAt: current.completedAt ?? now,
    currentStep: "done",
    updatedAt: now,
  };
  STORE.set(tenantId, next);
  return next;
}

export function restart(tenantId: string, userId: string): OnboardingProgress {
  const current = getOrCreateProgress(tenantId, userId);
  const now = new Date().toISOString();
  const next: OnboardingProgress = {
    ...current,
    currentStep: "trainer-info",
    completedSteps: [],
    skippedSteps: [],
    stepData: {},
    completedAt: null,
    restartCount: current.restartCount + 1,
    updatedAt: now,
  };
  STORE.set(tenantId, next);
  return next;
}

// Type-only re-export for callers that want the slug type but not the store.
export type { StepSlug };
