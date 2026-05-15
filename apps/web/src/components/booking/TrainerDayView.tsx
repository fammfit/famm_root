"use client";

import { useMemo } from "react";
import type { Booking } from "@/lib/booking/client/api";
import { formatTime, sameDay } from "./dateUtils";
import { cn } from "@/lib/cn";

const HOUR_HEIGHT = 56; // px
const START_HOUR = 6;
const END_HOUR = 22;

interface TrainerDayViewProps {
  day: Date;
  bookings: Booking[];
  onSelect?: (booking: Booking) => void;
}

/**
 * Vertical time-grid for a trainer's day. Each booking is positioned by start
 * minute and sized by duration — overlapping bookings split horizontally.
 */
export function TrainerDayView({ day, bookings, onSelect }: TrainerDayViewProps) {
  const dayBookings = useMemo(
    () =>
      bookings
        .filter((b) => sameDay(new Date(b.startAt), day))
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [bookings, day]
  );

  const positioned = useMemo(() => layoutOverlaps(dayBookings), [dayBookings]);

  const hours = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i
  );

  return (
    <div className="relative px-4 pb-12">
      <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-start gap-3"
            style={{ top: i * HOUR_HEIGHT }}
          >
            <span className="w-10 -mt-2 text-[11px] text-gray-400 tabular-nums uppercase">
              {formatHour(h)}
            </span>
            <div className="flex-1 border-t border-gray-100" />
          </div>
        ))}

        <NowLine day={day} />

        <div className="absolute inset-0 ml-[52px]">
          {positioned.map(({ booking, top, height, leftPct, widthPct }) => (
            <button
              key={booking.id}
              onClick={() => onSelect?.(booking)}
              className={cn(
                "absolute rounded-lg px-2 py-1.5 text-left",
                "transition-shadow touch-manipulation",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
                statusStyles(booking.status)
              )}
              style={{
                top,
                height: Math.max(height, 28),
                left: `${leftPct}%`,
                width: `calc(${widthPct}% - 4px)`,
              }}
            >
              <div className="text-[11px] font-semibold leading-tight tabular-nums">
                {formatTime(booking.startAt)}
              </div>
              <div className="text-[12px] font-medium leading-tight truncate">
                {booking.service?.name ?? "Session"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function statusStyles(status: Booking["status"]): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-50 border border-emerald-200 text-emerald-900 hover:shadow-sm";
    case "PENDING":
      return "bg-amber-50 border border-amber-200 text-amber-900 hover:shadow-sm";
    case "CANCELLED":
      return "bg-gray-50 border border-gray-200 text-gray-400 line-through";
    case "COMPLETED":
      return "bg-gray-50 border border-gray-200 text-gray-600";
    case "NO_SHOW":
      return "bg-red-50 border border-red-200 text-red-700";
    case "RESCHEDULED":
      return "bg-blue-50 border border-blue-200 text-blue-700";
  }
}

function formatHour(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${period}`;
}

interface Positioned {
  booking: Booking;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
}

function layoutOverlaps(bookings: Booking[]): Positioned[] {
  const result: Positioned[] = [];
  const columns: Booking[][] = [];

  for (const b of bookings) {
    const start = new Date(b.startAt);
    const end = new Date(b.endAt);
    let placed = false;
    for (const col of columns) {
      const last = col[col.length - 1];
      if (last && new Date(last.endAt) <= start) {
        col.push(b);
        placed = true;
        break;
      }
    }
    if (!placed) columns.push([b]);

    const startMins = start.getHours() * 60 + start.getMinutes();
    const endMins = end.getHours() * 60 + end.getMinutes();
    const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = ((endMins - startMins) / 60) * HOUR_HEIGHT;
    result.push({ booking: b, top, height, leftPct: 0, widthPct: 100 });
  }

  // Distribute columns
  const colCount = Math.max(1, columns.length);
  result.forEach((p) => {
    const colIndex = columns.findIndex((c) => c.includes(p.booking));
    const idx = colIndex === -1 ? 0 : colIndex;
    p.leftPct = (idx / colCount) * 100;
    p.widthPct = 100 / colCount;
  });

  return result;
}

function NowLine({ day }: { day: Date }) {
  const now = new Date();
  if (!sameDay(now, day)) return null;
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < START_HOUR * 60 || mins > END_HOUR * 60) return null;
  const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  return (
    <div
      className="absolute left-[52px] right-0 z-10 flex items-center"
      style={{ top }}
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-red-500 -ml-1" />
      <span className="flex-1 h-px bg-red-500" />
    </div>
  );
}
