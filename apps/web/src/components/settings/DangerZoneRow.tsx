"use client";

import * as React from "react";
import { Button } from "@famm/ui";

export interface DangerZoneRowProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  /** Why the action is currently disabled — surfaced as a small hint. */
  disabledReason?: string;
}

export function DangerZoneRow({
  title,
  description,
  actionLabel,
  onAction,
  disabled,
  disabledReason,
}: DangerZoneRowProps) {
  return (
    <div className="flex flex-col gap-stack-xs rounded-card border border-signal-danger/30 bg-signal-danger/5 p-inset-sm sm:flex-row sm:items-center sm:justify-between sm:gap-inline-sm">
      <div className="flex flex-col gap-stack-xs">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary">{description}</p>
        {disabled && disabledReason ? (
          <p className="text-xs text-signal-warning">{disabledReason}</p>
        ) : null}
      </div>
      <Button variant="destructive" size="md" onClick={onAction} disabled={disabled}>
        {actionLabel}
      </Button>
    </div>
  );
}
