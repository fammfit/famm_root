import * as React from "react";
import { Card } from "../primitives/card";
import { cn } from "../../lib/utils";

export interface StatCardProps {
  /** Short, screen-reader-friendly label. Visible above the value. */
  label: string;
  /** The metric itself. String so callers can pre-format (units, locale). */
  value: string;
  /** Optional unit shown smaller next to the value (e.g. "kg", "min"). */
  unit?: string;
  /** Optional supporting text (week-over-week, target, last set). */
  caption?: React.ReactNode;
  /** Visual emphasis. `pr` is reserved for personal-record moments (§2). */
  tone?: "default" | "success" | "warning" | "danger" | "pr";
  /** Stretches to fill its grid track. */
  stretch?: boolean;
  className?: string;
}

const toneToBorder: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-border-subtle",
  success: "border-signal-success/40",
  warning: "border-signal-warning/40",
  danger:  "border-signal-danger/40",
  pr:      "border-signal-pr/50",
};

const toneToAccent: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-text-primary",
  success: "text-signal-success",
  warning: "text-signal-warning",
  danger:  "text-signal-danger",
  pr:      "text-signal-pr",
};

/**
 * L2 — labelled metric for dashboards (weight, streak, volume, etc).
 * Composes the L1 Card. See docs/DESIGN_SYSTEM.md §3.
 */
export function StatCard({
  label,
  value,
  unit,
  caption,
  tone = "default",
  stretch = false,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-inset-lg",
        toneToBorder[tone],
        stretch && "h-full w-full",
        className,
      )}
      role="group"
      aria-label={label}
    >
      <div className="flex flex-col gap-stack-xs">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </span>
        <div className="flex items-baseline gap-inline-xs">
          <span
            className={cn(
              "text-3xl font-semibold tabular-nums leading-none",
              toneToAccent[tone],
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-text-muted">{unit}</span>
          )}
        </div>
        {caption && (
          <div className="text-xs text-text-muted">{caption}</div>
        )}
      </div>
    </Card>
  );
}
