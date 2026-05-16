"use client";

import type { TimeSlot } from "@famm/shared";
import { cn } from "@/lib/cn";
import { formatTime } from "./dateUtils";
import { Skeleton } from "@/components/ui/Skeleton";

interface SlotGridProps {
  slots: TimeSlot[];
  isLoading?: boolean;
  selectedStartAt?: string | null;
  onSelect: (slot: TimeSlot) => void;
  /** Render a "Join waitlist" affordance when full. */
  onJoinWaitlist?: (slot: TimeSlot) => void;
}

export function SlotGrid({
  slots,
  isLoading,
  selectedStartAt,
  onSelect,
  onJoinWaitlist,
}: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 px-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-500 text-sm">No times available for this day.</p>
        <p className="text-gray-400 text-xs mt-1">Try another date.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 px-4">
      {slots.map((slot) => {
        const isSelected = slot.startAt === selectedStartAt;
        const isFull = !slot.available;

        if (isFull && onJoinWaitlist) {
          return (
            <button
              key={slot.startAt}
              onClick={() => onJoinWaitlist(slot)}
              className={cn(
                "h-14 rounded-xl text-sm font-medium",
                "border border-dashed border-gray-300 text-gray-500",
                "hover:bg-gray-50 active:bg-gray-100 touch-manipulation",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
                "flex flex-col items-center justify-center"
              )}
            >
              <span className="text-[13px] tabular-nums line-through opacity-60">
                {formatTime(slot.startAt)}
              </span>
              <span className="text-[10px] uppercase tracking-wide">
                Waitlist
              </span>
            </button>
          );
        }

        return (
          <button
            key={slot.startAt}
            disabled={isFull}
            onClick={() => onSelect(slot)}
            aria-pressed={isSelected}
            className={cn(
              "h-14 rounded-xl text-sm font-medium tabular-nums",
              "touch-manipulation transition-all duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
              isFull && "bg-gray-50 text-gray-300 cursor-not-allowed line-through",
              !isFull && !isSelected && "bg-white border border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50 active:scale-95",
              isSelected && "bg-gray-900 text-white shadow-md scale-[1.02]"
            )}
          >
            {formatTime(slot.startAt)}
          </button>
        );
      })}
    </div>
  );
}
