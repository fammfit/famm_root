import * as React from "react";
import { Badge } from "@famm/ui";
import { cn } from "@/lib/cn";
import { CalendarColorDot } from "./CalendarColorDot";
import type { GoogleCalendar, GoogleCalendarAccessRole } from "@/lib/integrations/types";

const ROLE_LABEL: Record<GoogleCalendarAccessRole, string> = {
  OWNER: "Owner",
  WRITER: "Writer",
  READER: "Reader",
  FREE_BUSY_READER: "Busy-only",
};

export interface CalendarRowProps {
  calendar: GoogleCalendar;
  /** Read-list row uses a checkbox. */
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function CalendarRow({
  calendar,
  checked,
  onChange,
  name,
  disabled,
  disabledReason,
}: CalendarRowProps) {
  const id = `read-${calendar.id}`;
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
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-accent"
      />
      <CalendarColorDot colorHex={calendar.colorHex} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-inline-xs">
          <span className="truncate text-sm font-medium text-text-primary">{calendar.summary}</span>
          {calendar.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
        </span>
        <span className="flex flex-wrap items-center gap-inline-xs text-xs text-text-secondary">
          <span>{ROLE_LABEL[calendar.accessRole]}</span>
          {calendar.isSubscribed ? <span>· Subscribed</span> : null}
          {disabled && disabledReason ? <span>· {disabledReason}</span> : null}
        </span>
      </span>
    </label>
  );
}
