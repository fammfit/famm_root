"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { Integration, StripeAccountStatus } from "./types";

const STATUS_KEY = ["integration", "stripe", "status"] as const;

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class StripeApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "StripeApiError";
  }
}

async function readEnvelope<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) {
    const code = body?.error?.code ?? "UNKNOWN";
    const message = body?.error?.message ?? fallback;
    throw new StripeApiError(code, message, res.status);
  }
  return body.data as T;
}

export interface StripeStatusResponse {
  integration: Integration | null;
  account: StripeAccountStatus | null;
}

async function fetchStatus(): Promise<StripeStatusResponse> {
  const res = await fetch("/api/v1/integrations/stripe", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return readEnvelope(res, "Couldn't read Stripe status");
}

async function postConnect(): Promise<{ url: string }> {
  const res = await fetch("/api/v1/integrations/stripe/connect", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope(res, "Couldn't start Stripe onboarding");
}

async function postRefresh(): Promise<{ account: StripeAccountStatus }> {
  const res = await fetch("/api/v1/integrations/stripe/refresh", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope(res, "Couldn't refresh Stripe status");
}

async function postDisconnect(): Promise<{ ok: true }> {
  const res = await fetch("/api/v1/integrations/stripe", {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope(res, "Couldn't disconnect");
}

export interface UseStripeConnectResult {
  status: UseQueryResult<StripeStatusResponse>;
  connect: () => Promise<{ url: string }>;
  refresh: () => Promise<{ account: StripeAccountStatus }>;
  disconnect: () => Promise<{ ok: true }>;
  isConnecting: boolean;
  isRefreshing: boolean;
  isDisconnecting: boolean;
}

export function useStripeConnect(initial: StripeStatusResponse): UseStripeConnectResult {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: fetchStatus,
    initialData: initial,
    staleTime: 5_000,
  });

  const connectMutation = useMutation({
    mutationFn: postConnect,
  });

  const refreshMutation = useMutation({
    mutationFn: postRefresh,
    onSuccess: (data) => {
      qc.setQueryData(STATUS_KEY, (prev: StripeStatusResponse | undefined) => ({
        integration: prev?.integration ?? null,
        account: data.account,
      }));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: postDisconnect,
    onSuccess: () => {
      qc.setQueryData(STATUS_KEY, { integration: null, account: null });
    },
  });

  return {
    status,
    connect: () => connectMutation.mutateAsync(),
    refresh: () => refreshMutation.mutateAsync(),
    disconnect: () => disconnectMutation.mutateAsync(),
    isConnecting: connectMutation.isPending,
    isRefreshing: refreshMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
