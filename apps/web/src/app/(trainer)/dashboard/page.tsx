/**
 * @page Trainer Dashboard ("Today")
 *
 * Purpose: surface the trainer's next session, today's bookings, and the
 *   handful of numbers they care about between sessions.
 * Primary user: TRAINER, TRAINER_LEAD, TENANT_ADMIN, TENANT_OWNER.
 * Core actions: start/open next session, glance at today's schedule, jump
 *   to common create-flows (booking, client, service).
 * UI sections: AppBar, GreetingStrip, NextUp card, KPI row (4 tiles),
 *   Today agenda list, Shortcuts.
 * Empty state: first-run welcome with "Finish setup" CTA (when zero
 *   bookings and zero services).
 * Loading state: dashboard skeleton (loading.tsx).
 * Error state: error.tsx — friendly retry; data is non-critical.
 * Mobile layout: single column, content padded to bottom-tab floor, KPI
 *   row collapses to 2 columns under md, expands to 4 above.
 * Required data: see trainer-dashboard-data.ts (Booking, Service, User).
 * Related components: TrainerDashboard, NextUpCard, TodayRow, StatCard,
 *   EmptyState, BottomTabBar.
 * Route: /dashboard (trainer-only — gated by (trainer)/layout.tsx).
 */

import { Suspense } from "react";
import { AppBar } from "@/components/nav/AppBar";
import { TrainerDashboard } from "@/components/dashboard/TrainerDashboard";
import { getTrainerDashboardData } from "@/components/dashboard/trainer-dashboard-data";
import { WelcomeTutorialModal } from "@/components/onboarding/WelcomeTutorialModal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Today — FAMM",
  description: "Your day at a glance.",
};

export default async function TrainerDashboardPage() {
  const data = await getTrainerDashboardData();
  return (
    <>
      <AppBar title="Today" subtitle="Your day at a glance" />
      <TrainerDashboard data={data} />
      <Suspense fallback={null}>
        <WelcomeTutorialModal />
      </Suspense>
    </>
  );
}
