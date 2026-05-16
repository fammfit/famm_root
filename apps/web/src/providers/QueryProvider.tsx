"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider, type DefaultOptions } from "@tanstack/react-query";

const DEFAULT_OPTIONS: DefaultOptions = {
  queries: {
    // Trainers move between sessions quickly — short stale lets us reflect
    // bookings the client made on their phone without forcing a manual refresh.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      const status = (error as { status?: number } | undefined)?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return false;
      }
      return failureCount < 2;
    },
  },
  mutations: {
    // Mutations rarely benefit from automatic retry — the offline queue
    // handles the "no network" case explicitly. See lib/offline/.
    retry: false,
  },
};

function makeQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: DEFAULT_OPTIONS });
}

let browserClient: QueryClient | undefined;
function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always a fresh client per request to avoid cross-request cache bleed.
    return makeQueryClient();
  }
  if (!browserClient) browserClient = makeQueryClient();
  return browserClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const client = getQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
