"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { EmptyState, Input } from "@famm/ui";
import { CalendarRow } from "./CalendarRow";
import { WriteTargetRow } from "./WriteTargetRow";
import type { GoogleCalendar, GoogleCalendarAccessRole } from "@/lib/integrations/types";
import { cn } from "@/lib/cn";

export const CREATE_NEW_CALENDAR_ID = "create_new" as const;

const WRITABLE: ReadonlySet<GoogleCalendarAccessRole> = new Set(["OWNER", "WRITER"]);

export interface CalendarsSelectorProps {
  calendars: ReadonlyArray<GoogleCalendar>;
  readCalendarIds: ReadonlyArray<string>;
  writeCalendarId: string | null;
  onChangeRead: (ids: string[]) => void;
  onChangeWrite: (id: string) => void;
}

const SEARCH_THRESHOLD = 8;

export function CalendarsSelector({
  calendars,
  readCalendarIds,
  writeCalendarId,
  onChangeRead,
  onChangeWrite,
}: CalendarsSelectorProps) {
  const [showSearch, setShowSearch] = React.useState(calendars.length > SEARCH_THRESHOLD);
  const [query, setQuery] = React.useState("");

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calendars;
    return calendars.filter((c) => c.summary.toLowerCase().includes(q));
  }, [calendars, query]);

  const readSet = new Set(readCalendarIds);

  if (calendars.length === 0) {
    return (
      <EmptyState
        title="No calendars on this Google account"
        description="Your Google account has no accessible calendars. Try a different account, or skip and connect later from Settings."
      />
    );
  }

  function toggleRead(id: string, checked: boolean) {
    const next = new Set(readSet);
    if (checked) next.add(id);
    else next.delete(id);
    onChangeRead(Array.from(next));
  }

  function selectAllRead() {
    onChangeRead(calendars.map((c) => c.id));
  }
  function clearAllRead() {
    onChangeRead([]);
  }

  return (
    <div className="flex flex-col gap-stack-md">
      <fieldset className="flex flex-col gap-stack-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-inline-sm">
          <legend className="text-sm font-semibold text-text-primary">Show busy time from</legend>
          <span className="flex items-center gap-inline-sm text-xs">
            <button
              type="button"
              onClick={selectAllRead}
              className="font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Select all
            </button>
            <span aria-hidden="true" className="text-text-muted">
              ·
            </span>
            <button
              type="button"
              onClick={clearAllRead}
              className="font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Clear
            </button>
          </span>
        </div>

        {showSearch ? (
          <div className={cn("relative")}>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-inset-sm top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            />
            <Input
              aria-label="Filter calendars"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter calendars"
              className="pl-9"
            />
          </div>
        ) : null}

        <ul className="flex flex-col gap-stack-xs">
          {visible.map((cal) => (
            <li key={cal.id}>
              <CalendarRow
                name="read-calendars"
                calendar={cal}
                checked={readSet.has(cal.id)}
                onChange={(c) => toggleRead(cal.id, c)}
              />
            </li>
          ))}
        </ul>

        <p aria-live="polite" className="text-xs text-text-muted">
          {query
            ? `${visible.length} match${visible.length === 1 ? "" : "es"}`
            : `${readCalendarIds.length} of ${calendars.length} selected`}
        </p>

        {!showSearch && calendars.length > 4 ? (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="self-start text-xs font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Filter calendars
          </button>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-stack-sm">
        <legend className="text-sm font-semibold text-text-primary">Add new bookings to</legend>
        <ul className="flex flex-col gap-stack-xs">
          {calendars
            .filter((c) => WRITABLE.has(c.accessRole) && !c.isSubscribed)
            .map((cal) => (
              <li key={cal.id}>
                <WriteTargetRow
                  name="write-target"
                  calendar={cal}
                  checked={writeCalendarId === cal.id}
                  onSelect={() => onChangeWrite(cal.id)}
                />
              </li>
            ))}
          <li>
            <WriteTargetRow
              name="write-target"
              calendar={null}
              checked={writeCalendarId === CREATE_NEW_CALENDAR_ID}
              onSelect={() => onChangeWrite(CREATE_NEW_CALENDAR_ID)}
            />
          </li>
        </ul>
      </fieldset>
    </div>
  );
}
