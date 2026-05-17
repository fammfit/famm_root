/**
 * @page Trainer Calendar
 *
 * Purpose: visual schedule for the trainer — switch between a day-grid
 *   (vertical hours) and a month grid; tap to open or reschedule.
 * Primary user: TRAINER (own bookings) and TRAINER_LEAD / TENANT_ADMIN
 *   (tenant-wide).
 * Core actions: pick a date, open booking detail, reschedule, jump to
 *   "new booking" sheet, manage availability.
 * UI sections: AppBar with view toggle, DayStrip, day-grid OR
 *   month-grid, BookingDetailSheet (overlay), RescheduleSheet (overlay).
 * Empty state: empty day-grid renders a friendly "No sessions on
 *   {date}" message with a "Block time" / "Add booking" CTA inside
 *   TrainerDayView (already present).
 * Loading state: loading.tsx — week strip + day-grid skeletons.
 * Error state: error.tsx — retry; calendar fall-back to today.
 * Mobile layout: full-height day grid; horizontally-scrolling day strip;
 *   detail sheet is a bottom sheet. View toggle in AppBar actions slot.
 * Required data: Booking[] (via useBookings hook — realtime over WS).
 * Related components: TrainerCalendar (client component, exists),
 *   DayStrip, MonthCalendar, TrainerDayView, BookingDetailSheet,
 *   RescheduleSheet, AppBar.
 * Route: /calendar (trainer-only — gated by (trainer)/layout.tsx).
 */

import Link from "next/link";
import { CalendarPlus, Settings2 } from "lucide-react";
import { AppBar } from "@/components/nav/AppBar";
import { TrainerCalendar } from "@/components/booking/TrainerCalendar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar — FAMM",
  description: "Your schedule, day or month.",
};

export default function TrainerCalendarPage() {
  return (
    <>
      <AppBar
        title="Calendar"
        actions={
          <>
            <Link
              href="/calendar/availability"
              aria-label="Manage availability"
              className="inline-flex h-11 w-11 items-center justify-center rounded-control text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Settings2 aria-hidden className="h-5 w-5" />
            </Link>
            <Link
              href="/calendar/new"
              aria-label="New booking"
              className="inline-flex h-11 w-11 items-center justify-center rounded-control bg-accent text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <CalendarPlus aria-hidden className="h-5 w-5" />
            </Link>
          </>
        }
      />
      <TrainerCalendar />
    </>
  );
}
