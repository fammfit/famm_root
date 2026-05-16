/**
 * @page Client Account (/my/account) — STUB
 *
 * Purpose (planned): personal details, contact preferences, payment
 *   methods, notification opt-ins, sign-out, delete account.
 * Status: placeholder; full account surface ships with the Auth + Profile
 *   milestone (depends on PaymentMethod and NotificationPreference models).
 * Route: /my/account (client-only).
 */

import Link from "next/link";
import { AppBar } from "@/components/nav/AppBar";
import { ComingSoon } from "@/components/system-states/ComingSoon";

export const metadata = { title: "Account — FAMM" };

export default function MyAccountPage() {
  return (
    <>
      <AppBar title="Account" />
      <ComingSoon
        surface="Account"
        description="Manage your profile, payment methods, and notification preferences here."
        secondaryAction={
          <Link
            href="/my"
            className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Back to home
          </Link>
        }
      />
    </>
  );
}
