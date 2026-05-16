"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@famm/ui";
import { AppBar } from "@/components/nav/AppBar";

interface CalendarErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CalendarError({ error, reset }: CalendarErrorProps) {
  useEffect(() => {
    console.error("[calendar] render error", error);
  }, [error]);

  return (
    <>
      <AppBar title="Calendar" />
      <div className="flex min-h-[60vh] items-center justify-center p-inset-md">
        <ErrorState
          title="Calendar didn't load"
          description="Your bookings are safe. Try again, or open a single booking from Today."
          onRetry={reset}
          secondaryAction={
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Back to Today
            </Link>
          }
        />
      </div>
    </>
  );
}
