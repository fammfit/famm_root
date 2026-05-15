"use client";

import { useMemo, useState } from "react";
import { useBookings } from "@/lib/booking/client/useBookings";
import { MonthCalendar } from "./MonthCalendar";
import { TrainerDayView } from "./TrainerDayView";
import { DayStrip } from "./DayStrip";
import { BookingDetailSheet } from "./BookingDetailSheet";
import { RescheduleSheet } from "./RescheduleSheet";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import { sameDay, formatDateLong } from "./dateUtils";
import type { Booking } from "@/lib/booking/client/api";

type View = "day" | "month";

/**
 * Trainer-facing calendar: switch between a vertical day grid and a tappable
 * month grid. Realtime updates from useBookings keep the schedule in sync.
 */
export function TrainerCalendar() {
  const { bookings, isLoading, cancel, reschedule } = useBookings();
  const [view, setView] = useState<View>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [open, setOpen] = useState<Booking | null>(null);
  const [reschedTarget, setReschedTarget] = useState<Booking | null>(null);

  const markers = useMemo(() => {
    const map: Record<string, { dot: "primary"; count: number }> = {};
    for (const b of bookings) {
      if (b.status === "CANCELLED") continue;
      const d = new Date(b.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = { dot: "primary", count: 0 };
      map[key].count += 1;
    }
    return map;
  }, [bookings]);

  const dayBookings = useMemo(
    () => bookings.filter((b) => sameDay(new Date(b.startAt), selectedDate)),
    [bookings, selectedDate]
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-500">
              {formatDateLong(selectedDate)}
            </p>
          </div>
          <div className="flex bg-gray-100 rounded-full p-0.5">
            {(["day", "month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3.5 h-8 rounded-full text-xs font-semibold uppercase tracking-wide touch-manipulation",
                  "transition-colors",
                  view === v
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {view === "day" ? (
          <DayStrip selected={selectedDate} onSelect={setSelectedDate} days={45} />
        ) : null}
      </header>

      <main>
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : view === "day" ? (
          <>
            <div className="px-4 pt-3 pb-1 text-xs text-gray-500 uppercase tracking-wide font-semibold">
              {dayBookings.length} session
              {dayBookings.length === 1 ? "" : "s"}
            </div>
            <TrainerDayView
              day={selectedDate}
              bookings={bookings}
              onSelect={setOpen}
            />
          </>
        ) : (
          <>
            <MonthCalendar
              selected={selectedDate}
              onSelect={(d) => {
                setSelectedDate(d);
                setView("day");
              }}
              markers={markers}
            />
          </>
        )}
      </main>

      <BookingDetailSheet
        open={!!open}
        onClose={() => setOpen(null)}
        booking={open}
        onCancel={cancel}
        onReschedule={(b) => {
          setOpen(null);
          setReschedTarget(b);
        }}
      />
      <RescheduleSheet
        open={!!reschedTarget}
        onClose={() => setReschedTarget(null)}
        booking={reschedTarget}
        onReschedule={reschedule}
      />
    </div>
  );
}
