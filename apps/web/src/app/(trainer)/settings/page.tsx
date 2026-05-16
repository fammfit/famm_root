/**
 * @page Trainer Settings index (/settings) — STUB
 *
 * Purpose (planned): index of settings sub-pages — profile, business,
 *   branding, locations, notifications, team, billing, public-link,
 *   integrations (Google Cal, Stripe, Twilio, Push), security, danger zone.
 * Status: placeholder while the Settings milestone is in flight.
 * Route: /settings (trainer-only). Sub-pages live at /settings/<topic>.
 */

import Link from "next/link";
import { AppBar } from "@/components/nav/AppBar";
import { ComingSoon } from "@/components/system-states/ComingSoon";

export const metadata = { title: "More — FAMM" };

export default function SettingsIndexPage() {
  return (
    <>
      <AppBar title="More" />
      <ComingSoon
        surface="Settings"
        description="Profile, business, integrations, billing, and team will live here."
        secondaryAction={
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Back to Today
          </Link>
        }
      />
    </>
  );
}
