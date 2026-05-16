/**
 * @page Client Home (/my)
 *
 * Purpose: client's home — next session, recent activity counts, and a
 *   "book again" rail anchored on past trainers.
 * Primary user: CLIENT.
 * Core actions: open next booking, jump to full bookings list, re-book a
 *   trainer they've worked with.
 * UI sections: AppBar (title), Greeting, Next-up card, Activity counters,
 *   Book-again rail.
 * Empty state: first-run welcome when the client has no bookings of any
 *   status; otherwise per-section "no upcoming" empty card.
 * Loading state: loading.tsx — mirrors layout.
 * Error state: error.tsx — friendly retry, escape hatch to bookings list.
 * Mobile layout: single column, AppBar sticky, content padded to safe-area
 *   floor; activity stats are 2-col on every viewport for a tight phone fit.
 * Required data: see my-home-data.ts (Booking, User).
 * Related components: MyHome, NextCard, StatCard, EmptyState, BottomTabBar.
 * Route: /my (client-only — gated by (client)/layout.tsx).
 */

import { AppBar } from "@/components/nav/AppBar";
import { MyHome } from "@/components/client-portal/MyHome";
import { getMyHomeData } from "@/components/client-portal/my-home-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home — FAMM",
  description: "Your next session and recent activity.",
};

export default async function MyHomePage() {
  const data = await getMyHomeData();
  return (
    <>
      <AppBar title="Home" />
      <MyHome data={data} />
    </>
  );
}
