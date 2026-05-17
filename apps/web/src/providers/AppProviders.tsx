"use client";

import * as React from "react";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Composes every client-side provider into a single boundary so the root
 * layout stays declarative. Order matters:
 *   QueryProvider — data layer must be available before any consumer mounts.
 *   ToastProvider — UI feedback, depends on nothing else.
 *
 * Add new providers (Push, Offline, Analytics, FeatureFlags) here in the
 * order they need to initialize.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}
