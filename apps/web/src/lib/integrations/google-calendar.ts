"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { GoogleCalendar, GoogleCalendarSyncSettings, Integration } from "./types";

const STATUS_KEY = ["integration", "google_calendar", "status"] as const;
const CALENDARS_KEY = ["integration", "google_calendar", "calendars"] as const;

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class CalendarApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "CalendarApiError";
  }
}

async function readEnvelope<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) {
    const code = body?.error?.code ?? "UNKNOWN";
    const message = body?.error?.message ?? fallback;
    throw new CalendarApiError(code, message, res.status);
  }
  return body.data as T;
}

export interface CalendarStatusResponse {
  integration: Integration | null;
  settings: GoogleCalendarSyncSettings | null;
}

async function fetchStatus(): Promise<CalendarStatusResponse> {
  const res = await fetch("/api/v1/integrations/google-calendar", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return readEnvelope(res, "Couldn't read calendar integration status");
}

async function postConnect(): Promise<{ integration: Integration }> {
  const res = await fetch("/api/v1/integrations/google-calendar/connect", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope(res, "Couldn't connect Google Calendar");
}

async function postDisconnect(): Promise<{ ok: true }> {
  const res = await fetch("/api/v1/integrations/google-calendar", {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return readEnvelope(res, "Couldn't disconnect");
}

async function fetchCalendars(): Promise<{ calendars: GoogleCalendar[] }> {
  const res = await fetch("/api/v1/integrations/google-calendar/calendars", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return readEnvelope(res, "Couldn't load your calendars");
}

export interface SaveSettingsInput {
  readCalendarIds: ReadonlyArray<string>;
  writeCalendarId: string;
}

async function patchSettings(input: SaveSettingsInput): Promise<CalendarStatusResponse> {
  const res = await fetch("/api/v1/integrations/google-calendar/settings", {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readEnvelope(res, "Couldn't save calendar settings");
}

export interface UseGoogleCalendarResult {
  status: UseQueryResult<CalendarStatusResponse>;
  calendars: UseQueryResult<{ calendars: GoogleCalendar[] }>;
  connect: () => Promise<{ integration: Integration }>;
  disconnect: () => Promise<{ ok: true }>;
  saveSettings: (input: SaveSettingsInput) => Promise<CalendarStatusResponse>;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isSaving: boolean;
}

export function useGoogleCalendar(initial: CalendarStatusResponse): UseGoogleCalendarResult {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: fetchStatus,
    initialData: initial,
    staleTime: 5_000,
  });

  const connected = Boolean(status.data?.integration);

  const calendars = useQuery({
    queryKey: CALENDARS_KEY,
    queryFn: fetchCalendars,
    enabled: connected,
    staleTime: 30_000,
  });

  const connectMutation = useMutation({
    mutationFn: postConnect,
    onSuccess: (data) => {
      // After connect, status returns to the resolver — refetch both.
      qc.setQueryData(STATUS_KEY, (prev: CalendarStatusResponse | undefined) => ({
        integration: data.integration,
        settings: prev?.settings ?? null,
      }));
      void qc.invalidateQueries({ queryKey: STATUS_KEY });
      void qc.invalidateQueries({ queryKey: CALENDARS_KEY });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: postDisconnect,
    onSuccess: () => {
      qc.setQueryData(STATUS_KEY, { integration: null, settings: null });
      qc.removeQueries({ queryKey: CALENDARS_KEY });
    },
  });

  const saveMutation = useMutation({
    mutationFn: patchSettings,
    onSuccess: (data) => {
      qc.setQueryData(STATUS_KEY, data);
      // Settings save can fabricate a new calendar — refetch the list.
      void qc.invalidateQueries({ queryKey: CALENDARS_KEY });
    },
  });

  return {
    status,
    calendars,
    connect: () => connectMutation.mutateAsync(),
    disconnect: () => disconnectMutation.mutateAsync(),
    saveSettings: (input) => saveMutation.mutateAsync(input),
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSaving: saveMutation.isPending,
  };
}
