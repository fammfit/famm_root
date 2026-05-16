/**
 * @page Client Bookings (/my/bookings)
 *
 * Purpose: client's full booking list — segmented into "Upcoming" and
 *   "Past" tabs. Tap a row to open booking detail.
 * Primary user: CLIENT.
 * Core actions: switch tab, open booking detail, return to home.
 * UI sections: AppBar (with back), TabBar (Upcoming / Past with counts),
 *   list of BookingRow.
 * Empty state: per-tab — "No upcoming sessions" or "No past sessions" with
 *   helpful copy and an escape hatch to /my.
 * Loading state: loading.tsx — tab bar + 5 row skeletons.
 * Error state: error.tsx — retry; escape hatch to home.
 * Mobile layout: list takes full width; tab bar sits sticky-ish under the
 *   AppBar; tap targets are the full row (44+ px tall).
 * Required data: see my-bookings-data.ts (Booking, Service, Location,
 *   TrainerProfile/User). Caps at 50 rows per tab — pagination follows.
 * Related components: MyBookings, BookingRow, TabBar, EmptyState.
 * Route: /my/bookings (client-only — gated by (client)/layout.tsx).
 *   `?tab=past` switches to the past list.
 */

import { AppBar } from "@/components/nav/AppBar";
import { MyBookings } from "@/components/client-portal/MyBookings";
import { getMyBookingsData, type BookingsTab } from "@/components/client-portal/my-bookings-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings — FAMM",
  description: "Your upcoming and past sessions.",
};

interface PageProps {
  searchParams?: { tab?: string };
}

export default async function MyBookingsPage({ searchParams }: PageProps) {
  const tab: BookingsTab = searchParams?.tab === "past" ? "past" : "upcoming";
  const data = await getMyBookingsData(tab);
  return (
    <>
      <AppBar title="Bookings" />
      <MyBookings data={data} />
    </>
  );
}
