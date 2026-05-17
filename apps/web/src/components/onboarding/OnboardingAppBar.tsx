"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/cn";
import { SafeAreaInset } from "@/components/nav/SafeAreaInset";

export interface OnboardingAppBarProps {
  onExit: () => void;
  onHelp: () => void;
}

export function OnboardingAppBar({ onExit, onHelp }: OnboardingAppBarProps) {
  return (
    <SafeAreaInset
      as="header"
      edges={["top", "left", "right"]}
      className={cn("sticky top-0 z-30 border-b border-border bg-surface")}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-inline-sm px-inset-md">
        <span className="inline-flex items-center gap-inline-xs">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-card bg-accent text-onAccent"
          >
            <Dumbbell aria-hidden className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-text-primary">Setup</span>
        </span>
        <div className="flex items-center gap-inline-xs">
          <button
            type="button"
            onClick={onHelp}
            aria-label="Onboarding help"
            className="inline-flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <HelpCircle aria-hidden className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex h-9 items-center justify-center rounded-control px-inset-sm text-sm font-medium text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Save and exit
          </button>
        </div>
      </div>
    </SafeAreaInset>
  );
}
