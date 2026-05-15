"use client";

import { useEffect, useRef } from "react";
import { addDays, sameDay } from "./dateUtils";
import { cn } from "@/lib/cn";

interface DayStripProps {
  selected: Date;
  onSelect: (d: Date) => void;
  /** Number of days rendered, starting from today. */
  days?: number;
}

/**
 * Horizontally scrollable day picker (ClassPass-style).
 * Snaps to each chip; selected chip auto-scrolls into view.
 */
export function DayStrip({ selected, onSelect, days = 30 }: DayStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLButtonElement>(
      `[data-day-selected="true"]`
    );
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "flex gap-2 overflow-x-auto px-4 py-3",
        "snap-x snap-mandatory scroll-px-4 scrollbar-none",
        "[&::-webkit-scrollbar]:hidden"
      )}
      style={{ scrollbarWidth: "none" }}
      role="tablist"
      aria-label="Date"
    >
      {Array.from({ length: days }, (_, i) => {
        const d = addDays(today, i);
        const isSelected = sameDay(d, selected);
        const isToday = i === 0;
        return (
          <button
            key={d.toISOString()}
            data-day-selected={isSelected}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(d)}
            className={cn(
              "flex-shrink-0 snap-center w-14 h-[68px] rounded-2xl",
              "flex flex-col items-center justify-center gap-0.5",
              "touch-manipulation transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
              isSelected
                ? "bg-gray-900 text-white shadow-md scale-[1.02]"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95"
            )}
          >
            <span
              className={cn(
                "text-[11px] uppercase tracking-wide",
                isSelected ? "text-white/70" : "text-gray-500"
              )}
            >
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </span>
            <span className="text-lg font-semibold tabular-nums leading-none">
              {d.getDate()}
            </span>
            {isToday && !isSelected ? (
              <span className="h-1 w-1 rounded-full bg-gray-900" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
