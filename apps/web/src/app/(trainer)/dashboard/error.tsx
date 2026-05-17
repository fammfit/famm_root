"use client";

import { useEffect } from "react";
import { ErrorState } from "@famm/ui";
import { AppBar } from "@/components/nav/AppBar";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("[dashboard] render error", error);
  }, [error]);

  return (
    <>
      <AppBar title="Today" />
      <div className="flex min-h-[60vh] items-center justify-center p-inset-md">
        <ErrorState
          title="We couldn't load your dashboard"
          description="This is usually a temporary glitch. Try again, or open your calendar in the meantime."
          onRetry={reset}
        />
      </div>
    </>
  );
}
