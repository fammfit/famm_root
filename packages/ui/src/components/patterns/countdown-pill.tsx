"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface CountdownPillProps {
  /** Target ISO timestamp. The pill renders nothing once the target passes. */
  targetIso: string;
  /** Visual urgency. `high` flips the pill to the danger token. */
  urgency?: "low" | "medium" | "high";
  /**
   * Fires once when the countdown crosses zero. Callers typically use this
   * to swap their surface to an "expired" variant without a page reload.
   */
  onExpire?: () => void;
  /** Override the prefix. Default: "Ends in". */
  label?: string;
  className?: string;
}

interface Remaining {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeRemaining(targetMs: number): Remaining {
  const delta = targetMs - Date.now();
  if (delta <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSeconds = Math.floor(delta / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, expired: false };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * L2 — token-driven countdown badge. Used by promo offers, hold expiry
 * indicators, and any other "this expires soon" surface.
 *
 * Accessibility: the ticking digits are aria-hidden to avoid screen-reader
 * spam every second. An offscreen text mirror with `aria-live="polite"`
 * announces a coarse remaining time on each minute boundary.
 */
export function CountdownPill({
  targetIso,
  urgency = "medium",
  onExpire,
  label = "Ends in",
  className,
}: CountdownPillProps) {
  const targetMs = React.useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [remaining, setRemaining] = React.useState<Remaining>(() => computeRemaining(targetMs));
  const expiredRef = React.useRef(remaining.expired);

  React.useEffect(() => {
    if (remaining.expired) return;
    const id = window.setInterval(() => {
      const next = computeRemaining(targetMs);
      setRemaining(next);
      if (next.expired && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetMs, onExpire, remaining.expired]);

  if (remaining.expired) return null;

  const tone =
    urgency === "high"
      ? "bg-signal-danger/10 text-signal-danger"
      : urgency === "low"
        ? "bg-surface-sunken text-text-secondary"
        : "bg-signal-warning/10 text-signal-warning";

  const announcement =
    remaining.hours > 0
      ? `${label} ${remaining.hours} hours and ${remaining.minutes} minutes`
      : `${label} ${remaining.minutes} minutes`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-inline-xs rounded-pill px-inset-sm py-1 text-xs font-semibold",
        tone,
        className
      )}
    >
      <span aria-hidden="true">{label}</span>
      <span aria-hidden="true" className="tabular-nums">
        {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </span>
  );
}
