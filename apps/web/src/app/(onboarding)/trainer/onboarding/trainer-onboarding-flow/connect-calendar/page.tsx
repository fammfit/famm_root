/**
 * @page Onboarding Step 5 — Connect Calendar
 *   (/trainer/onboarding/trainer-onboarding-flow/connect-calendar)
 *
 * Purpose: optional Google Calendar connection so the existing
 *   scheduling engine can read busy time (conflict-detect) and write
 *   new bookings to the trainer's calendar.
 * Primary user: TENANT_OWNER / TENANT_ADMIN.
 * Core actions: Connect Google Calendar, pick which calendars feed
 *   busy-time, pick a write target (or "Create a new FAMM calendar"),
 *   Save and continue, Disconnect, or Skip.
 * UI sections: spec hint, OAuth-return error banner, GoogleConnectCard,
 *   CalendarsSelector (read checkboxes + write radios), conflict-info
 *   card. Disconnect Sheet.
 * Empty state: connected with 0 accessible calendars → EmptyState
 *   inside the selector with "Try a different account".
 * Loading state: skeleton rows for calendars while fetching.
 * Error state: ErrorState below the connect card on listing-fetch
 *   failure; inline alert above the connect card on connect failure.
 * Mobile layout: single column; shell sticky footer carries Back /
 *   Skip / Continue.
 * Required data: Integration row keyed by (tenantId, "google_calendar"),
 *   GoogleCalendar[] from the stub listings endpoint, sync settings.
 * Related components: GoogleConnectCard, CalendarsSelector, CalendarRow,
 *   WriteTargetRow, CalendarColorDot.
 * Route: /trainer/onboarding/trainer-onboarding-flow/connect-calendar
 *   (trainer-only — gated by the (onboarding) route group).
 */

import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { getStep } from "@/lib/onboarding/steps";
import { getRequestContext } from "@/lib/request-context";
import { getCalendarsIntegration } from "@/lib/integrations/mock-google-calendar";
import { ConnectCalendarStep } from "./connect-calendar-step";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sync your calendar — FAMM",
};

interface PageProps {
  searchParams?: Record<string, string | undefined>;
}

export default function ConnectCalendarPage({ searchParams }: PageProps) {
  const ctx = getRequestContext();
  const step = getStep("connect-calendar");
  const bundle = getCalendarsIntegration(ctx.tenantId);
  const initialStatus = {
    integration: bundle?.integration ?? null,
    settings: bundle?.settings ?? null,
  };
  const initialReason =
    searchParams?.google === "error" ? (searchParams.reason ?? "api_error") : null;
  return (
    <OnboardingStepBody>
      <header className="flex flex-col gap-stack-xs">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Step {step.index} of 7
        </p>
        <h1 tabIndex={-1} className="text-2xl font-semibold text-text-primary md:text-3xl">
          {step.title}
        </h1>
      </header>
      <ConnectCalendarStep initialStatus={initialStatus} initialReason={initialReason} />
    </OnboardingStepBody>
  );
}
