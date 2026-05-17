export type StepSlug =
  | "trainer-info"
  | "import-business"
  | "business-info"
  | "public-profile"
  | "connect-calendar"
  | "connect-payments"
  | "import-contacts";

export interface OnboardingStepDef {
  slug: StepSlug;
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  shortTitle: string;
  required: boolean;
  blocksDashboard: boolean;
  estimatedMinutes: number;
}

export interface OnboardingProgress {
  id: string;
  tenantId: string;
  userId: string;
  currentStep: StepSlug | "done";
  completedSteps: StepSlug[];
  skippedSteps: StepSlug[];
  stepData: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  restartCount: number;
  updatedAt: string;
}

export type ProgressPatchAction = "complete" | "skip" | "patch" | "current";

export interface ProgressPatchInput {
  slug?: StepSlug;
  action: ProgressPatchAction;
  stepData?: Record<string, unknown>;
}
