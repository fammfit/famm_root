"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@famm/ui";
import { cn } from "@/lib/cn";
import { SafeAreaInset } from "@/components/nav/SafeAreaInset";

export interface OnboardingFooterProps {
  /** Hidden if there's no previous step. */
  onBack?: () => void;
  /** Hidden if the step is required. */
  onSkip?: () => void;
  onContinue: () => void | Promise<void>;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
}

export function OnboardingFooter({
  onBack,
  onSkip,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  continueLoading = false,
}: OnboardingFooterProps) {
  return (
    <SafeAreaInset
      as="footer"
      edges={["bottom", "left", "right"]}
      className={cn("sticky bottom-0 z-20 border-t border-border bg-surface")}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-inline-sm px-inset-md py-inset-sm">
        <div className="flex items-center gap-inline-xs">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onBack}
              aria-label="Go to previous step"
            >
              <ArrowLeft aria-hidden className="mr-inline-xs h-4 w-4" />
              Back
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-inline-sm">
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex h-10 items-center justify-center rounded-control px-inset-sm text-sm font-medium text-text-secondary transition-colors duration-fast ease-standard hover:text-text-primary focus-visible:outline-none focus-visible:underline"
            >
              Skip
            </button>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={() => void onContinue()}
            disabled={continueDisabled || continueLoading}
            loading={continueLoading}
          >
            {continueLabel}
            <ArrowRight aria-hidden className="ml-inline-xs h-4 w-4" />
          </Button>
        </div>
      </div>
    </SafeAreaInset>
  );
}
