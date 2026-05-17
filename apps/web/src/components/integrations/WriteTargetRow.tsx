import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { CalendarColorDot } from "./CalendarColorDot";
import type { GoogleCalendar } from "@/lib/integrations/types";

export interface WriteTargetRowProps {
  /** When null, this is the synthetic "Create a new FAMM calendar" option. */
  calendar: GoogleCalendar | null;
  checked: boolean;
  onSelect: () => void;
  name: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function WriteTargetRow({
  calendar,
  checked,
  onSelect,
  name,
  disabled,
  disabledReason,
}: WriteTargetRowProps) {
  const id = calendar ? `write-${calendar.id}` : "write-create-new";
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-inline-sm rounded-card border bg-surface px-inset-sm py-inset-xs",
        "transition-colors duration-fast ease-standard",
        checked ? "border-accent bg-accent-subtle" : "border-border hover:bg-surface-sunken",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect()}
        className="h-4 w-4 shrink-0 accent-accent"
      />
      {calendar ? (
        <CalendarColorDot colorHex={calendar.colorHex} />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-3 w-3 shrink-0 items-center justify-center rounded-pill border border-dashed border-border text-text-secondary"
        >
          <Plus className="h-2 w-2" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-text-primary">
          {calendar ? calendar.summary : "Create a new FAMM calendar"}
        </span>
        <span className="text-xs text-text-secondary">
          {calendar
            ? calendar.isPrimary
              ? "Primary · we'll add bookings here"
              : "We'll add bookings here"
            : "We'll create a fresh calendar named after your business"}
          {disabled && disabledReason ? ` · ${disabledReason}` : ""}
        </span>
      </span>
    </label>
  );
}
