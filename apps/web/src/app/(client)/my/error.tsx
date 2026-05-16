"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@famm/ui";
import { AppBar } from "@/components/nav/AppBar";

interface MyHomeErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MyHomeError({ error, reset }: MyHomeErrorProps) {
  useEffect(() => {
    console.error("[/my] render error", error);
  }, [error]);

  return (
    <>
      <AppBar title="Home" />
      <div className="flex min-h-[60vh] items-center justify-center p-inset-md">
        <ErrorState
          title="We couldn't load your home"
          description="Your bookings are safe — this is usually a temporary blip."
          onRetry={reset}
          secondaryAction={
            <Link
              href="/my/bookings"
              className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Open bookings
            </Link>
          }
        />
      </div>
    </>
  );
}
