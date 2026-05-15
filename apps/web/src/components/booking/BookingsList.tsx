"use client";

import { useMemo, useState } from "react";
import { useBookings } from "@/lib/booking/client/useBookings";
import type { Booking } from "@/lib/booking/client/api";
import { BookingCard } from "./BookingCard";
import { BookingDetailSheet } from "./BookingDetailSheet";
import { RescheduleSheet } from "./RescheduleSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type Tab = "upcoming" | "past";

export function BookingsList() {
  const { bookings, isLoading, error, cancel, reschedule, refresh } =
    useBookings();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [open, setOpen] = useState<Booking | null>(null);
  const [reschedTarget, setReschedTarget] = useState<Booking | null>(null);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    for (const b of bookings) {
      const t = new Date(b.startAt).getTime();
      if (t >= now && b.status !== "CANCELLED" && b.status !== "COMPLETED") {
        upcoming.push(b);
      } else {
        past.push(b);
      }
    }
    upcoming.sort((a, b) => a.startAt.localeCompare(b.startAt));
    past.sort((a, b) => b.startAt.localeCompare(a.startAt));
    return { upcoming, past };
  }, [bookings]);

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold text-gray-900">My bookings</h1>
        </div>
        <div className="px-4 flex gap-1 pb-2">
          {(["upcoming", "past"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 h-9 rounded-full text-sm font-medium capitalize touch-manipulation",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
                tab === t
                  ? "bg-gray-900 text-white"
                  : "bg-transparent text-gray-500 hover:bg-gray-100"
              )}
            >
              {t}
              {t === "upcoming" && upcoming.length > 0 ? (
                <span className="ml-1 opacity-70 tabular-nums">
                  {upcoming.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-2.5">
        {isLoading ? (
          <>
            <Skeleton className="h-[88px] rounded-2xl" />
            <Skeleton className="h-[88px] rounded-2xl" />
            <Skeleton className="h-[88px] rounded-2xl" />
          </>
        ) : error ? (
          <div className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => refresh()}
              className="text-xs font-medium underline"
            >
              Retry
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">
              {tab === "upcoming"
                ? "No upcoming bookings."
                : "No past bookings yet."}
            </p>
          </div>
        ) : (
          list.map((b) => (
            <BookingCard key={b.id} booking={b} onClick={() => setOpen(b)} />
          ))
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
