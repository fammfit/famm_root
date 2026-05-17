import * as React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CapabilityChecklistProps {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface Row {
  label: string;
  enabled: boolean;
  helperEnabled: string;
  helperDisabled: string;
}

export function CapabilityChecklist({ chargesEnabled, payoutsEnabled }: CapabilityChecklistProps) {
  const rows: ReadonlyArray<Row> = [
    {
      label: "Take card payments",
      enabled: chargesEnabled,
      helperEnabled: "Clients can pay at checkout.",
      helperDisabled: "Not yet — Stripe is reviewing your details.",
    },
    {
      label: "Receive payouts",
      enabled: payoutsEnabled,
      helperEnabled: "Money lands in your bank on a schedule.",
      helperDisabled: "Not yet — finish the requirements below.",
    },
  ];

  return (
    <ul className="flex flex-col gap-stack-xs">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex items-start gap-inline-sm rounded-card border border-border bg-surface p-inset-sm"
        >
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill",
              row.enabled
                ? "bg-signal-success/10 text-signal-success"
                : "border border-border text-text-muted"
            )}
          >
            {row.enabled ? (
              <Check aria-hidden className="h-3 w-3" />
            ) : (
              <Circle aria-hidden className="h-2 w-2" />
            )}
          </span>
          <div className="flex flex-col gap-stack-xs">
            <span className="text-sm font-medium text-text-primary">
              {row.enabled ? row.label : `${row.label} — not yet`}
            </span>
            <span className="text-xs text-text-secondary">
              {row.enabled ? row.helperEnabled : row.helperDisabled}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
