"use client";

import { useMemo, useState } from "react";
import { addDays, sameDay, WEEKDAY_LABELS } from "./dateUtils";
import { cn } from "@/lib/cn";

interface MonthCalendarProps {
  selected: Date;
  onSelect: (d: Date) => void;
  /** Optional per-day signal: dot colors, badge counts. */
  markers?: Record<string, { dot?: "primary" | "muted"; count?: number }>;
  /** Restrict selection to today and forward. */
  blockPast?: boolean;
}

/**
 * Tappable month grid for trainer/full-calendar views.
 * Mobile-first: 44px tap targets, swipe-prev/next via arrow buttons.
 */
export function MonthCalendar({
  selected,
  onSelect,
  markers,
  blockPast = false,
}: MonthCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(selected);
    d.setDate(1);
    return d;
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = addDays(firstOfMonth, -startOffset);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="px-4 py-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">{monthLabel}</h3>
        <div className="flex gap-1">
          <button
            aria-label="Previous month"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
            className="h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            aria-label="Next month"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
            className="h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 mb-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {grid.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isSelected = sameDay(d, selected);
          const isToday = sameDay(d, today);
          const disabled = blockPast && d < today;
          const marker = markers?.[isoKey(d)];

          return (
            <button
              key={d.toISOString()}
              disabled={disabled}
              onClick={() => onSelect(d)}
              className={cn(
                "relative mx-auto h-11 w-11 rounded-full flex items-center justify-center",
                "text-sm tabular-nums touch-manipulation transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
                disabled && "text-gray-300 cursor-not-allowed",
                !disabled && !inMonth && "text-gray-300",
                !disabled && inMonth && "text-gray-800",
                isSelected && "bg-gray-900 !text-white font-semibold",
                !isSelected && isToday && "ring-1 ring-gray-900",
                !isSelected && !disabled && "hover:bg-gray-100 active:bg-gray-200"
              )}
            >
              {d.getDate()}
              {marker?.dot && !isSelected ? (
                <span
                  className={cn(
                    "absolute bottom-1.5 h-1 w-1 rounded-full",
                    marker.dot === "primary" ? "bg-gray-900" : "bg-gray-300"
                  )}
                />
              ) : null}
              {marker?.count && marker.count > 0 && !isSelected ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
                  {marker.count > 9 ? "9+" : marker.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isoKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
