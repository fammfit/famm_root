import * as React from "react";
import { cn } from "../../lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional icon — rendered above the title in a soft surface badge. */
  icon?: React.ReactNode;
  /** Headline. Keep under 6 words. */
  title: string;
  /** One-sentence explanation of why the surface is empty and what to do next. */
  description?: string;
  /** Primary action — usually the "do the thing" CTA. */
  action?: React.ReactNode;
  /** Secondary action — escape hatch (e.g. "Learn more"). */
  secondaryAction?: React.ReactNode;
}

/**
 * L2 — uniform empty state for any list/detail surface. Always pair with a
 * single primary action so the user knows what to do next.
 * See design-system/ux-rules.md §"Strong empty states".
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-stack-sm",
        "p-inset-lg text-center",
        className
      )}
      {...rest}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-card bg-surface-sunken text-text-secondary"
        >
          {icon}
        </div>
      ) : null}
      <div className="flex flex-col gap-stack-xs">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {description ? (
          <p className="max-w-prose text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-inline-sm pt-stack-xs">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
