"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { GoogleBusinessListing, Integration } from "./types";

const STATUS_KEY = ["integration", "google_business", "status"] as const;
const LISTINGS_KEY = ["integration", "google_business", "listings"] as const;

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class IntegrationApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "IntegrationApiError";
  }
}

async function readEnvelope<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) {
    const code = body?.error?.code ?? "UNKNOWN";
    const message = body?.error?.message ?? fallback;
    throw new IntegrationApiError(code, message, res.status);
  }
  return body.data as T;
}

async function fetchStatus(): Promise<{ integration: Integration | null }> {
  const res = await fetch("/api/v1/integrations/google-business", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return readEnvelope(res, "Couldn't read integration status");
}

async function postConnect(): Promise<{ integration: Integration }> {
  const res = await fetch("/api/v1/integrations/google-business/connect", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope(res, "Couldn't connect to Google");
}

async function postDisconnect(): Promise<{ ok: true }> {
  const res = await fetch("/api/v1/integrations/google-business", {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope(res, "Couldn't disconnect");
}

async function fetchListings(query?: string): Promise<{ listings: GoogleBusinessListing[] }> {
  const url = query
    ? `/api/v1/integrations/google-business/listings?q=${encodeURIComponent(query)}`
    : "/api/v1/integrations/google-business/listings";
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return readEnvelope(res, "Couldn't load businesses");
}

export interface UseGoogleBusinessResult {
  status: UseQueryResult<{ integration: Integration | null }>;
  listings: UseQueryResult<{ listings: GoogleBusinessListing[] }>;
  connect: () => Promise<{ integration: Integration }>;
  disconnect: () => Promise<{ ok: true }>;
  refetchListings: (q?: string) => Promise<GoogleBusinessListing[]>;
  isConnecting: boolean;
  isDisconnecting: boolean;
}

export function useGoogleBusiness(initialIntegration: Integration | null): UseGoogleBusinessResult {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: fetchStatus,
    initialData: { integration: initialIntegration },
    staleTime: 5_000,
  });

  const connected = Boolean(status.data?.integration);

  const listings = useQuery({
    queryKey: LISTINGS_KEY,
    queryFn: () => fetchListings(),
    enabled: connected,
    staleTime: 30_000,
  });

  const connectMutation = useMutation({
    mutationFn: postConnect,
    onSuccess: (data) => {
      qc.setQueryData(STATUS_KEY, { integration: data.integration });
      // Listings will hydrate via `enabled` flipping true on the next render.
      void qc.invalidateQueries({ queryKey: LISTINGS_KEY });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: postDisconnect,
    onSuccess: () => {
      qc.setQueryData(STATUS_KEY, { integration: null });
      qc.removeQueries({ queryKey: LISTINGS_KEY });
    },
  });

  async function refetchListings(q?: string): Promise<GoogleBusinessListing[]> {
    const data = await fetchListings(q);
    qc.setQueryData(LISTINGS_KEY, data);
    return data.listings;
  }

  return {
    status,
    listings,
    connect: () => connectMutation.mutateAsync(),
    disconnect: () => disconnectMutation.mutateAsync(),
    refetchListings,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
