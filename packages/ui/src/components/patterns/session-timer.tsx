import * as React from "react";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/use-reduced-motion";

export interface SessionTimerProps {
  /** Remaining time in seconds. Parent owns the tick — this component only renders. */
  remainingSeconds: number;
  /** Total duration in seconds, used for the progress ring. */
  totalSeconds: number;
  /** Accessible label (e.g. "Rest timer", "Set timer"). Read by screen readers. */
  label: string;
  /** Show an `aria-live` update so SR users hear changes. Set false during pause. */
  announce?: boolean;
  /** Optional secondary line under the time (e.g. "Set 3 of 5"). */
  caption?: React.ReactNode;
  className?: string;
}

const formatTime = (totalSeconds: number) => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * L2 — circular countdown with accessible live updates. Stateless: parent
 * drives the clock. Respects prefers-reduced-motion: when reduced, the ring
 * snaps to each second instead of animating between frames.
 * See docs/DESIGN_SYSTEM.md §5.
 */
export function SessionTimer({
  remainingSeconds,
  totalSeconds,
  label,
  announce = true,
  caption,
  className,
}: SessionTimerProps) {
  const reducedMotion = useReducedMotion();
  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.min(1, Math.max(0, remainingSeconds / safeTotal));

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-stack-xs", className)}
      role="timer"
      aria-label={label}
    >
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-border-subtle"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            className={cn(
              "text-accent",
              reducedMotion
                ? "transition-none"
                : "transition-[stroke-dashoffset] duration-base ease-linear",
            )}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums text-text-primary"
          aria-live={announce ? "polite" : "off"}
          aria-atomic="true"
        >
          {formatTime(remainingSeconds)}
        </div>
      </div>
      {caption && <div className="text-xs text-text-muted">{caption}</div>}
    </div>
  );
}
