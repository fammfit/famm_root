import * as React from "react";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/cn";

interface AuthShellProps {
  /** Page content — typically a single card. */
  children: React.ReactNode;
  /** Headline above the card. */
  title: string;
  /** Sub-headline. Keep to one line. */
  subtitle?: string;
  /** Footer slot (e.g. "Already have an account? Sign in"). */
  footer?: React.ReactNode;
  /** Disable the brand mark for white-label tenant landing pages. */
  hideBrand?: boolean;
}

/**
 * Shell for the unauthenticated auth surface (/login, /register, /verify,
 * /auth/magic-link). Centered card on every viewport, with the brand mark
 * pinned above so the user knows where they are even when arriving from a
 * deep link in an email.
 */
export function AuthShell({
  children,
  title,
  subtitle,
  footer,
  hideBrand = false,
}: AuthShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-surface-sunken",
        "px-inset-md py-inset-lg"
      )}
    >
      <div className="flex w-full max-w-sm flex-col gap-stack-lg">
        {!hideBrand ? (
          <div className="flex items-center justify-center gap-inline-xs">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-card bg-accent text-onAccent"
            >
              <Dumbbell aria-hidden className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold text-text-primary">FAMM</span>
          </div>
        ) : null}
        <header className="flex flex-col gap-stack-xs text-center">
          <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
          {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
        </header>
        <div className="rounded-card border border-border bg-surface p-inset-lg shadow-sm">
          {children}
        </div>
        {footer ? (
          <footer className="text-center text-sm text-text-secondary">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
