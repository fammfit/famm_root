"use client";

import * as React from "react";
import { LifeBuoy, RotateCcw } from "lucide-react";
import { Sheet, SheetHeader, SheetBody } from "@famm/ui";

interface OnboardingHelpSheetProps {
  open: boolean;
  onClose: () => void;
  /** Open the destructive restart confirm. */
  onRequestRestart: () => void;
  /** Disable restart for non-owners. */
  canRestart: boolean;
}

export function OnboardingHelpSheet({
  open,
  onClose,
  onRequestRestart,
  canRestart,
}: OnboardingHelpSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} ariaLabelledBy="onboarding-help-title">
      <SheetHeader
        title="Need a hand?"
        description="A few quick options."
        onClose={onClose}
        titleId="onboarding-help-title"
      />
      <SheetBody>
        <ul className="flex flex-col gap-stack-xs">
          <li>
            <a
              href="mailto:support@famm.fit"
              className="flex w-full items-center gap-inline-sm rounded-card border border-border bg-surface p-inset-sm text-left text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <LifeBuoy aria-hidden className="h-5 w-5 text-text-secondary" />
              <span className="flex flex-col">
                <span>Talk to support</span>
                <span className="text-xs font-normal text-text-secondary">
                  We usually answer within an hour during business days.
                </span>
              </span>
            </a>
          </li>
          {canRestart ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestRestart();
                }}
                className="flex w-full items-center gap-inline-sm rounded-card border border-border bg-surface p-inset-sm text-left text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <RotateCcw aria-hidden className="h-5 w-5 text-signal-warning" />
                <span className="flex flex-col">
                  <span>Start over</span>
                  <span className="text-xs font-normal text-text-secondary">
                    Clears everything you&rsquo;ve entered so far.
                  </span>
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      </SheetBody>
    </Sheet>
  );
}
