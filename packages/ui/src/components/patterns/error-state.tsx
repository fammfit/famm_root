import * as React from "react";
import { cn } from "../../lib/utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Headline. Default: "Something went wrong". */
  title?: string;
  /** Human-readable description. Avoid leaking stack traces here. */
  description?: string;
  /** Optional retry handler — renders a primary action when provided. */
  onRetry?: () => void;
  /** Override the retry label. */
  retryLabel?: string;
  /** Secondary escape hatch (e.g. "Contact support"). */
  secondaryAction?: React.ReactNode;
}

/**
 * L2 — uniform error state. Use whenever a fetch/mutation fails *and* the
 * user can do something about it. For unrecoverable errors (e.g. 500 on a
 * detail page), pair with `secondaryAction` linking to a safe surface.
 * See design-system/ux-rules.md §"Strong error states".
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this just now. Try again in a moment.",
  onRetry,
  retryLabel = "Try again",
  secondaryAction,
  className,
  ...rest
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-stack-sm",
        "p-inset-lg text-center",
        className
      )}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-card bg-signal-danger/10 text-signal-danger"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      <div className="flex flex-col gap-stack-xs">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="max-w-prose text-sm text-text-secondary">{description}</p>
      </div>
      {(onRetry || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-inline-sm pt-stack-xs">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-control",
                "bg-accent px-inset-md text-sm font-medium text-onAccent",
                "transition-colors duration-fast ease-standard",
                "hover:bg-accent-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
            >
              {retryLabel}
            </button>
          ) : null}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
