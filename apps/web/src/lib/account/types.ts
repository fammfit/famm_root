/**
 * Domain types for the Account & Settings page. Independent of the
 * stub persistence layer below so the UI can be tested in isolation.
 */

export type MemberRole = "TENANT_OWNER" | "TENANT_ADMIN" | "TRAINER_LEAD" | "TRAINER" | "CLIENT";

export type MemberStatus = "invited" | "active" | "suspended";

export interface Teammate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: MemberRole;
  status: MemberStatus;
  invitedAt: string;
  joinedAt: string | null;
}

export type MfaMethod = "none" | "sms" | "totp";

export interface SecuritySnapshot {
  mfaMethod: MfaMethod;
  passwordUpdatedAt: string | null;
  hasPassword: boolean;
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  ipAddress: string | null;
  lastSeenAt: string;
  isCurrent: boolean;
}

export interface BookingDefaults {
  minLeadTimeMinutes: number;
  cancellationWindowHours: number;
  autoConfirm: boolean;
  noShowFee: {
    enabled: boolean;
    amountMinor: number;
    currency: string;
  };
}

export interface TaxSettings {
  inclusive: boolean;
  defaultRateBps: number;
  invoiceFromName: string;
  invoiceFromAddress: string;
}

export type NotificationEvent =
  | "booking.confirmed"
  | "booking.reminder.24h"
  | "booking.reminder.1h"
  | "booking.cancelled"
  | "payment.succeeded"
  | "payment.failed";

export type NotificationChannel = "email" | "sms";

export type NotificationPrefs = Record<NotificationEvent, Record<NotificationChannel, boolean>>;

export interface TransferTicket {
  ticketId: string;
  smsHint: string;
}
