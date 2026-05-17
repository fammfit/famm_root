"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { OnboardingProgress, ProgressPatchInput, StepSlug } from "./types";

const QUERY_KEY = ["onboarding-progress"] as const;

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function readEnvelope<T>(res: Response, fallbackMessage: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) {
    const message = body?.error?.message ?? fallbackMessage;
    throw new Error(message);
  }
  return body.data as T;
}

async function fetchProgress(): Promise<OnboardingProgress> {
  const res = await fetch("/api/v1/onboarding/progress", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return readEnvelope<OnboardingProgress>(res, "Couldn't load onboarding state");
}

async function patchProgress(input: ProgressPatchInput): Promise<OnboardingProgress> {
  const res = await fetch("/api/v1/onboarding/progress", {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readEnvelope<OnboardingProgress>(res, "Couldn't update onboarding state");
}

async function completeFlow(): Promise<{
  progress: OnboardingProgress;
  redirectTo: string;
}> {
  const res = await fetch("/api/v1/onboarding/complete", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope<{ progress: OnboardingProgress; redirectTo: string }>(
    res,
    "Couldn't finish onboarding"
  );
}

async function restartFlow(): Promise<OnboardingProgress> {
  const res = await fetch("/api/v1/onboarding/restart", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope<OnboardingProgress>(res, "Couldn't restart onboarding");
}

export interface UseOnboardingProgressResult {
  query: UseQueryResult<OnboardingProgress>;
  markComplete: (slug: StepSlug, stepData?: Record<string, unknown>) => Promise<OnboardingProgress>;
  markSkipped: (slug: StepSlug) => Promise<OnboardingProgress>;
  patch: (slug: StepSlug, stepData: Record<string, unknown>) => Promise<OnboardingProgress>;
  setCurrent: (slug: StepSlug) => Promise<OnboardingProgress>;
  complete: () => Promise<{ progress: OnboardingProgress; redirectTo: string }>;
  restart: () => Promise<OnboardingProgress>;
  isMutating: boolean;
}

export function useOnboardingProgress(
  initialData?: OnboardingProgress
): UseOnboardingProgressResult {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchProgress,
    initialData,
    staleTime: 5_000,
  });

  function applyResult(data: OnboardingProgress) {
    qc.setQueryData(QUERY_KEY, data);
    return data;
  }

  const patchMutation = useMutation({
    mutationFn: patchProgress,
    onSuccess: applyResult,
  });
  const completeMutation = useMutation({
    mutationFn: completeFlow,
    onSuccess: ({ progress }) => {
      applyResult(progress);
    },
  });
  const restartMutation = useMutation({
    mutationFn: restartFlow,
    onSuccess: applyResult,
  });

  return {
    query,
    markComplete: (slug, stepData) =>
      patchMutation.mutateAsync({ slug, action: "complete", stepData }),
    markSkipped: (slug) => patchMutation.mutateAsync({ slug, action: "skip" }),
    patch: (slug, stepData) => patchMutation.mutateAsync({ slug, action: "patch", stepData }),
    setCurrent: (slug) => patchMutation.mutateAsync({ slug, action: "current" }),
    complete: () => completeMutation.mutateAsync(),
    restart: () => restartMutation.mutateAsync(),
    isMutating: patchMutation.isPending || completeMutation.isPending || restartMutation.isPending,
  };
}
