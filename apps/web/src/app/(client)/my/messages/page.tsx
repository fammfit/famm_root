/**
 * @page Client Messages (/my/messages) — STUB
 *
 * Purpose (planned): one thread per trainer with bi-directional messaging
 *   and read receipts; integrates with Twilio for SMS fallback.
 * Status: placeholder so the bottom-tab nav lands somewhere; full build
 *   ships with the Messaging milestone.
 * Route: /my/messages (client-only).
 */

import Link from "next/link";
import { AppBar } from "@/components/nav/AppBar";
import { ComingSoon } from "@/components/system-states/ComingSoon";

export const metadata = { title: "Messages — FAMM" };

export default function MyMessagesPage() {
  return (
    <>
      <AppBar title="Messages" />
      <ComingSoon
        surface="Messages"
        description="Threads with your trainer will live here, including reminders and confirmations."
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
