"use client";

import * as React from "react";
import type { StepSlug } from "./types";

export type StepSubmitHandler = () => Promise<boolean>;

export interface OnboardingStepRegistration {
  /** Override the footer's Continue label (e.g. "Connect Google"). */
  continueLabel?: string;
  /** Disable Continue (e.g. while a required field is empty). */
  continueDisabled?: boolean;
  /**
   * Called when the user taps Continue. Return true to advance, false to
   * stay (the step page surfaces its own inline error).
   */
  onContinue?: StepSubmitHandler;
  /** Marks the current step dirty so Save-and-exit asks for confirmation. */
  dirty?: boolean;
}

interface OnboardingStepState {
  slug: StepSlug;
  continueLabel: string;
  continueDisabled: boolean;
  dirty: boolean;
  /** Resolves to true if the step submitted ok; false to stay. */
  runContinue: () => Promise<boolean>;
}

interface ContextValue {
  /** Step pages call this on mount to register handlers. */
  register: (slug: StepSlug, value: OnboardingStepRegistration) => void;
  /** Step pages call this on unmount or to swap handlers. */
  unregister: (slug: StepSlug) => void;
  /** Read-only state for the footer / shell. */
  state: OnboardingStepState | null;
}

const OnboardingStepContext = React.createContext<ContextValue | null>(null);

export function OnboardingStepProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<OnboardingStepState | null>(null);
  const registrationsRef = React.useRef<Map<StepSlug, OnboardingStepRegistration>>(new Map());

  const recompute = React.useCallback((slug: StepSlug | null) => {
    if (!slug) {
      setState(null);
      return;
    }
    const reg = registrationsRef.current.get(slug) ?? {};
    setState({
      slug,
      continueLabel: reg.continueLabel ?? "Continue",
      continueDisabled: reg.continueDisabled ?? false,
      dirty: reg.dirty ?? false,
      runContinue: async () => {
        const r = registrationsRef.current.get(slug);
        if (!r?.onContinue) return true;
        return r.onContinue();
      },
    });
  }, []);

  const register = React.useCallback(
    (slug: StepSlug, value: OnboardingStepRegistration) => {
      registrationsRef.current.set(slug, value);
      recompute(slug);
    },
    [recompute]
  );

  const unregister = React.useCallback(
    (slug: StepSlug) => {
      registrationsRef.current.delete(slug);
      recompute(null);
    },
    [recompute]
  );

  return (
    <OnboardingStepContext.Provider value={{ register, unregister, state }}>
      {children}
    </OnboardingStepContext.Provider>
  );
}

export function useOnboardingStepContext(): ContextValue {
  const ctx = React.useContext(OnboardingStepContext);
  if (!ctx) {
    throw new Error("useOnboardingStepContext must be used inside OnboardingStepProvider");
  }
  return ctx;
}

/**
 * Step-page hook. Registers per-step behavior with the shell.
 *
 * Usage:
 *   useOnboardingStep("trainer-info", {
 *     continueLabel: "Save and continue",
 *     continueDisabled: !formValid,
 *     onContinue: async () => { await save(); return true; },
 *     dirty: form.formState.isDirty,
 *   });
 */
export function useOnboardingStep(slug: StepSlug, registration: OnboardingStepRegistration): void {
  const { register, unregister } = useOnboardingStepContext();
  // Stabilize the dependency surface — re-run only when relevant fields change.
  const { continueLabel, continueDisabled, dirty, onContinue } = registration;
  React.useEffect(() => {
    register(slug, { continueLabel, continueDisabled, dirty, onContinue });
    return () => unregister(slug);
  }, [slug, continueLabel, continueDisabled, dirty, onContinue, register, unregister]);
}
