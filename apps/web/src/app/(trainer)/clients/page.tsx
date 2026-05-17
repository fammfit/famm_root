/**
 * @page Trainer Clients (/clients) — STUB
 *
 * Purpose (planned): searchable client list with segments (active, lapsed,
 *   new), tap-through to a per-client overview (notes, credits, forms,
 *   workouts, payments, messages).
 * Status: placeholder while the Clients milestone is in flight.
 * Route: /clients (trainer-only).
 */

import Link from "next/link";
import { AppBar } from "@/components/nav/AppBar";
import { ComingSoon } from "@/components/system-states/ComingSoon";

export const metadata = { title: "Clients — FAMM" };

export default function ClientsPage() {
  return (
    <>
      <AppBar title="Clients" />
      <ComingSoon
        surface="Clients"
        description="Your client list, notes, credits, forms, and per-client history will live here."
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
