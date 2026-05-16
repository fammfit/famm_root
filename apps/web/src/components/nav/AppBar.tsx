"use client";

import * as React from "react";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { SafeAreaInset } from "./SafeAreaInset";

export interface AppBarProps {
  /** Page title — shown centered on mobile, left-aligned on ≥md. */
  title: string;
  /** Optional one-line context under the title. */
  subtitle?: string;
  /** Show back button (mobile-style chevron). */
  showBack?: boolean;
  onBack?: () => void;
  /** Trailing actions (e.g. icon buttons). Max 3 — anything else goes in an overflow menu. */
  actions?: React.ReactNode;
  /** Sticky to the top of the scroll container. Default: true. */
  sticky?: boolean;
  className?: string;
}

/**
 * Top app bar. Always paired with SafeAreaInset top edge so it lives under
 * the notch / status bar correctly. On ≥md, expands into a denser bar with
 * left-aligned title.
 */
export function AppBar({
  title,
  subtitle,
  showBack,
  onBack,
  actions,
  sticky = true,
  className,
}: AppBarProps) {
  return (
    <SafeAreaInset
      as="header"
      edges={["top", "left", "right"]}
      className={cn("z-30 bg-surface border-b border-border", sticky && "sticky top-0", className)}
    >
      <div className="flex h-14 items-center gap-inline-sm px-inset-md">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center -ml-inset-sm",
              "rounded-control text-text-primary",
              "transition-colors duration-fast ease-standard",
              "hover:bg-surface-sunken",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            )}
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-base font-semibold text-text-primary">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-text-secondary">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-inline-xs">{actions}</div> : null}
      </div>
    </SafeAreaInset>
  );
}

interface AppBarIconActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
}

/** Convenience icon button for AppBar.actions slot — enforces aria-label. */
export function AppBarIconAction({ label, icon, className, ...rest }: AppBarIconActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center",
        "rounded-control text-text-secondary",
        "transition-colors duration-fast ease-standard",
        "hover:bg-surface-sunken hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className
      )}
      {...rest}
    >
      <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
    </button>
  );
}

export { MoreHorizontal as AppBarMoreIcon };
