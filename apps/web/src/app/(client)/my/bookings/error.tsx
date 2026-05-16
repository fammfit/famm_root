"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@famm/ui";
import { AppBar } from "@/components/nav/AppBar";

interface MyBookingsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MyBookingsError({ error, reset }: MyBookingsErrorProps) {
  useEffect(() => {
    console.error("[/my/bookings] render error", error);
  }, [error]);

  return (
    <>
      <AppBar title="Bookings" />
      <div className="flex min-h-[60vh] items-center justify-center p-inset-md">
        <ErrorState
          title="We couldn't load your bookings"
          onRetry={reset}
          secondaryAction={
            <Link
              href="/my"
              className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Back to home
            </Link>
          }
        />
      </div>
    </>
  );
}
