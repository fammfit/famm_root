import type { OnboardingStepDef, StepSlug } from "./types";

export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStepDef> = [
  {
    slug: "trainer-info",
    index: 1,
    title: "Tell us about you",
    shortTitle: "Trainer",
    required: true,
    blocksDashboard: true,
    estimatedMinutes: 1,
  },
  {
    slug: "import-business",
    index: 2,
    title: "Bring your business in",
    shortTitle: "Import",
    required: false,
    blocksDashboard: false,
    estimatedMinutes: 1,
  },
  {
    slug: "business-info",
    index: 3,
    title: "Your business basics",
    shortTitle: "Business",
    required: true,
    blocksDashboard: true,
    estimatedMinutes: 2,
  },
  {
    slug: "public-profile",
    index: 4,
    title: "Your public profile",
    shortTitle: "Profile",
    required: true,
    blocksDashboard: true,
    estimatedMinutes: 2,
  },
  {
    slug: "connect-calendar",
    index: 5,
    title: "Sync your calendar",
    shortTitle: "Calendar",
    required: false,
    blocksDashboard: false,
    estimatedMinutes: 1,
  },
  {
    slug: "connect-payments",
    index: 6,
    title: "Take payments",
    shortTitle: "Pay",
    required: false,
    blocksDashboard: false,
    estimatedMinutes: 2,
  },
  {
    slug: "import-contacts",
    index: 7,
    title: "Bring your clients",
    shortTitle: "Contacts",
    required: false,
    blocksDashboard: false,
    estimatedMinutes: 1,
  },
] as const;

export const STEP_BASE_PATH = "/trainer/onboarding/trainer-onboarding-flow";

export function isStepSlug(value: unknown): value is StepSlug {
  return typeof value === "string" && ONBOARDING_STEPS.some((s) => s.slug === value);
}

export function getStep(slug: StepSlug): OnboardingStepDef {
  const step = ONBOARDING_STEPS.find((s) => s.slug === slug);
  if (!step) {
    throw new Error(`Unknown onboarding step: ${slug}`);
  }
  return step;
}

export function nextStep(slug: StepSlug): StepSlug | null {
  const i = ONBOARDING_STEPS.findIndex((s) => s.slug === slug);
  const next = ONBOARDING_STEPS[i + 1];
  return next ? next.slug : null;
}

export function previousStep(slug: StepSlug): StepSlug | null {
  const i = ONBOARDING_STEPS.findIndex((s) => s.slug === slug);
  const prev = i > 0 ? ONBOARDING_STEPS[i - 1] : undefined;
  return prev ? prev.slug : null;
}

export function stepHref(slug: StepSlug | "done"): string {
  if (slug === "done") return "/dashboard?onboarding=done";
  return `${STEP_BASE_PATH}/${slug}`;
}

export function requiredStepsRemaining(completed: ReadonlyArray<StepSlug>): OnboardingStepDef[] {
  return ONBOARDING_STEPS.filter((s) => s.required && !completed.includes(s.slug));
}
