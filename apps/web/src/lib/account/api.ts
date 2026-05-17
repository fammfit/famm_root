"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActiveSession,
  BookingDefaults,
  MemberRole,
  NotificationPrefs,
  SecuritySnapshot,
  TaxSettings,
  Teammate,
  TransferTicket,
} from "./types";

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function read<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) {
    throw new Error(body?.error?.message ?? fallback);
  }
  return body.data as T;
}

async function get<T>(url: string, fallback: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return read<T>(res, fallback);
}

async function send<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  fallback: string
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  return read<T>(res, fallback);
}

// ── Security ────────────────────────────────────────────────────────────

export function useSecurity() {
  return useQuery({
    queryKey: ["account", "security"],
    queryFn: () =>
      get<{ security: SecuritySnapshot; sessions: ActiveSession[] }>(
        "/api/v1/account/security",
        "Couldn't load security"
      ),
    staleTime: 10_000,
  });
}

export function useUpdateSecurity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { mfaMethod?: "none" | "sms" | "totp" }) =>
      send<{ security: SecuritySnapshot }>(
        "/api/v1/account/security",
        "PATCH",
        patch,
        "Couldn't save"
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "security"] });
    },
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      send<{ sessions: ActiveSession[] }>(
        "/api/v1/account/security/revoke-others",
        "POST",
        undefined,
        "Couldn't revoke sessions"
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "security"] });
    },
  });
}

// ── Team ────────────────────────────────────────────────────────────────

export function useTeam() {
  return useQuery({
    queryKey: ["account", "team"],
    queryFn: () => get<{ members: Teammate[] }>("/api/v1/team/members", "Couldn't load team"),
    staleTime: 10_000,
  });
}

export function useInviteTeammate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      email: string;
      firstName: string;
      lastName: string;
      role: Exclude<MemberRole, "TENANT_OWNER" | "CLIENT" | "SUPER_ADMIN" | "GUEST">;
    }) =>
      send<{ teammate: Teammate }>("/api/v1/team/members", "POST", input, "Couldn't send invite"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "team"] });
    },
  });
}

export function useUpdateTeammateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; role: MemberRole }) =>
      send<{ teammate: Teammate }>(
        `/api/v1/team/members/${encodeURIComponent(input.id)}`,
        "PATCH",
        { role: input.role },
        "Couldn't change role"
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "team"] });
    },
  });
}

export function useRemoveTeammate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      send<{ removed: boolean }>(
        `/api/v1/team/members/${encodeURIComponent(id)}`,
        "DELETE",
        undefined,
        "Couldn't remove"
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "team"] });
    },
  });
}

// ── Booking defaults ────────────────────────────────────────────────────

export function useBookingDefaults() {
  return useQuery({
    queryKey: ["account", "booking-defaults"],
    queryFn: () =>
      get<{ bookingDefaults: BookingDefaults }>(
        "/api/v1/account/booking-defaults",
        "Couldn't load defaults"
      ),
    staleTime: 30_000,
  });
}

export function useUpdateBookingDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<BookingDefaults>) =>
      send<{ bookingDefaults: BookingDefaults }>(
        "/api/v1/account/booking-defaults",
        "PATCH",
        patch,
        "Couldn't save"
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "booking-defaults"] });
    },
  });
}

// ── Tax ─────────────────────────────────────────────────────────────────

export function useTax() {
  return useQuery({
    queryKey: ["account", "tax"],
    queryFn: () => get<{ tax: TaxSettings }>("/api/v1/account/tax-settings", "Couldn't load tax"),
    staleTime: 30_000,
  });
}

export function useUpdateTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<TaxSettings>) =>
      send<{ tax: TaxSettings }>("/api/v1/account/tax-settings", "PATCH", patch, "Couldn't save"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "tax"] });
    },
  });
}

// ── Notifications ───────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: ["account", "notifications"],
    queryFn: () =>
      get<{ notifications: NotificationPrefs }>(
        "/api/v1/account/notifications",
        "Couldn't load notifications"
      ),
    staleTime: 30_000,
  });
}

export function useUpdateNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) =>
      send<{ notifications: NotificationPrefs }>(
        "/api/v1/account/notifications",
        "PATCH",
        { prefs },
        "Couldn't save"
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "notifications"] });
    },
  });
}

// ── Danger zone ────────────────────────────────────────────────────────

export function useInitiateTransfer() {
  return useMutation({
    mutationFn: (targetUserId: string) =>
      send<TransferTicket>(
        "/api/v1/account/transfer-ownership/initiate",
        "POST",
        { targetUserId },
        "Couldn't start transfer"
      ),
  });
}

export function useConfirmTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { ticketId: string; code: string }) =>
      send<{ newOwnerId: string }>(
        "/api/v1/account/transfer-ownership/confirm",
        "POST",
        input,
        "Couldn't confirm"
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "team"] });
    },
  });
}

export function useCloseAccount() {
  return useMutation({
    mutationFn: (confirmation: string) =>
      send<{ closedAt: string }>(
        "/api/v1/account/close",
        "POST",
        { confirmation },
        "Couldn't close account"
      ),
  });
}
