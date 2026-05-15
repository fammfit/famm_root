"use client";

import type { Booking } from "@/lib/booking/client/api";
import { cn } from "@/lib/cn";
import { formatTime } from "./dateUtils";

interface BookingCardProps {
  booking: Booking;
  onClick?: () => void;
}

const STATUS_STYLES: Record<Booking["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-500",
  COMPLETED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-700",
  RESCHEDULED: "bg-blue-100 text-blue-700",
};

export function BookingCard({ booking, onClick }: BookingCardProps) {
  const start = new Date(booking.startAt);
  const isCancelled = booking.status === "CANCELLED";
  const trainerName = [
    booking.trainer?.user?.firstName,
    booking.trainer?.user?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-2xl bg-white border border-gray-100",
        "hover:border-gray-200 active:bg-gray-50 transition-colors touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
        isCancelled && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-gray-50 shrink-0">
          <span className="text-[10px] font-semibold uppercase text-gray-500 tracking-wide">
            {start.toLocaleDateString(undefined, { month: "short" })}
          </span>
          <span className="text-xl font-bold tabular-nums text-gray-900 leading-none">
            {start.getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {booking.service?.name ?? "Session"}
            </h3>
            <span
              className={cn(
                "text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap",
                STATUS_STYLES[booking.status]
              )}
            >
              {booking.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5 tabular-nums">
            {formatTime(booking.startAt)} – {formatTime(booking.endAt)}
          </p>
          {(trainerName || booking.location?.name) && (
            <p className="text-xs text-gray-400 mt-1 truncate">
              {[trainerName, booking.location?.name].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
