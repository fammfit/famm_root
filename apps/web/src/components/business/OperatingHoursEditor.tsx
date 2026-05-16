"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DayOfWeek, OperatingHourEntry } from "@/lib/business/types";

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "17:00";

const DAY_LABELS: ReadonlyArray<{ value: DayOfWeek; long: string; short: string }> = [
  { value: 1, long: "Monday", short: "Mon" },
  { value: 2, long: "Tuesday", short: "Tue" },
  { value: 3, long: "Wednesday", short: "Wed" },
  { value: 4, long: "Thursday", short: "Thu" },
  { value: 5, long: "Friday", short: "Fri" },
  { value: 6, long: "Saturday", short: "Sat" },
  { value: 0, long: "Sunday", short: "Sun" },
];

const WEEKDAYS: ReadonlyArray<DayOfWeek> = [1, 2, 3, 4, 5];
const WEEKEND: ReadonlyArray<DayOfWeek> = [6, 0];

export interface OperatingHoursEditorProps {
  value: ReadonlyArray<OperatingHourEntry>;
  onChange: (next: OperatingHourEntry[]) => void;
  /** Surface a top-of-editor error when none of the days are open. */
  error?: string;
}

function byDay(
  entries: ReadonlyArray<OperatingHourEntry>
): Partial<Record<DayOfWeek, OperatingHourEntry>> {
  const map: Partial<Record<DayOfWeek, OperatingHourEntry>> = {};
  for (const e of entries) map[e.dayOfWeek] = e;
  return map;
}

export function OperatingHoursEditor({ value, onChange, error }: OperatingHoursEditorProps) {
  const map = byDay(value);

  function setDay(day: DayOfWeek, next: OperatingHourEntry | null) {
    const others = value.filter((e) => e.dayOfWeek !== day);
    const merged = next ? [...others, next] : others;
    merged.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    onChange(merged);
  }

  function setBulkOpen(days: ReadonlyArray<DayOfWeek>, open: boolean) {
    const others = value.filter((e) => !days.includes(e.dayOfWeek));
    const additions = open
      ? days.map<OperatingHourEntry>((d) => ({
          dayOfWeek: d,
          open: DEFAULT_OPEN,
          close: DEFAULT_CLOSE,
        }))
      : [];
    const merged = [...others, ...additions];
    merged.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    onChange(merged);
  }

  function copyWeekdaysToWeekend() {
    const ref = value.find((e) => WEEKDAYS.includes(e.dayOfWeek));
    if (!ref) return;
    const others = value.filter((e) => !WEEKEND.includes(e.dayOfWeek));
    const additions = WEEKEND.map<OperatingHourEntry>((d) => ({
      dayOfWeek: d,
      open: ref.open,
      close: ref.close,
    }));
    const merged = [...others, ...additions];
    merged.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    onChange(merged);
  }

  return (
    <div className="flex flex-col gap-stack-sm">
      <div className="flex flex-wrap items-center gap-inline-sm">
        <button
          type="button"
          onClick={() => setBulkOpen(WEEKDAYS, true)}
          className="rounded-pill border border-border bg-surface px-inset-sm py-1 text-xs font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Open Mon–Fri
        </button>
        <button
          type="button"
          onClick={() => setBulkOpen([...WEEKDAYS, ...WEEKEND], false)}
          className="rounded-pill border border-border bg-surface px-inset-sm py-1 text-xs font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Closed all week
        </button>
        <button
          type="button"
          onClick={copyWeekdaysToWeekend}
          disabled={!value.some((e) => WEEKDAYS.includes(e.dayOfWeek))}
          className="inline-flex items-center gap-inline-xs rounded-pill border border-border bg-surface px-inset-sm py-1 text-xs font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy aria-hidden className="h-3 w-3" />
          Copy weekdays to weekend
        </button>
      </div>

      <ul className="flex flex-col gap-stack-xs">
        {DAY_LABELS.map(({ value: day, long, short }) => {
          const entry = map[day];
          const isOpen = Boolean(entry);
          return (
            <li
              key={day}
              className={cn(
                "flex flex-col gap-stack-xs rounded-card border border-border bg-surface p-inset-sm",
                "sm:flex-row sm:items-center sm:gap-inline-md"
              )}
            >
              <div className="flex items-center justify-between gap-inline-sm sm:w-32">
                <span className="text-sm font-medium text-text-primary">
                  <span className="sm:hidden">{long}</span>
                  <span className="hidden sm:inline">{short}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOpen}
                  aria-label={`${long} open or closed`}
                  onClick={() =>
                    setDay(
                      day,
                      isOpen ? null : { dayOfWeek: day, open: DEFAULT_OPEN, close: DEFAULT_CLOSE }
                    )
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border transition-colors duration-fast ease-standard",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    isOpen ? "border-accent bg-accent" : "border-border bg-surface-sunken"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block h-5 w-5 rounded-pill bg-surface shadow-sm transition-transform duration-fast ease-standard",
                      isOpen ? "translate-x-[1.25rem]" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
              {isOpen && entry ? (
                <div className="flex items-center gap-inline-sm">
                  <input
                    type="time"
                    aria-label={`${long} open time`}
                    value={entry.open}
                    onChange={(e) => setDay(day, { ...entry, open: e.target.value })}
                    className="h-10 w-32 rounded-control border border-border bg-surface px-inset-sm text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  />
                  <span aria-hidden="true" className="text-text-secondary">
                    –
                  </span>
                  <input
                    type="time"
                    aria-label={`${long} close time`}
                    value={entry.close}
                    onChange={(e) => setDay(day, { ...entry, close: e.target.value })}
                    className="h-10 w-32 rounded-control border border-border bg-surface px-inset-sm text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  />
                </div>
              ) : (
                <span className="text-xs text-text-muted">Closed</span>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
