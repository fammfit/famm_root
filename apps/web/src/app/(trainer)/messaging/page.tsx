/**
 * @page Trainer Messaging (/messaging) — STUB
 *
 * Purpose (planned): thread list, compose, reminder-rule editor, message
 *   templates. Twilio-backed for SMS, with in-app for app users.
 * Status: placeholder; full Messaging milestone introduces the Message,
 *   MessageThread, MessageTemplate, and ReminderRule models.
 * Route: /messaging (trainer-only).
 */

import Link from "next/link";
import { AppBar } from "@/components/nav/AppBar";
import { ComingSoon } from "@/components/system-states/ComingSoon";

export const metadata = { title: "Messages — FAMM" };

export default function MessagingPage() {
  return (
    <>
      <AppBar title="Messages" />
      <ComingSoon
        surface="Messages"
        description="Threads with your clients, templates, and reminder rules will live here."
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
