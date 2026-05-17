export type IntegrationProvider = "google_business" | "google_calendar" | "stripe" | "twilio";

export type IntegrationStatus = "CONNECTED" | "EXPIRED" | "REVOKED";

export interface Integration {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  externalAccountId: string;
  externalAccountEmail: string;
  scopes: ReadonlyArray<string>;
  /** ISO timestamp; null until the first sync runs. */
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleBusinessAddress {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface GoogleBusinessHours {
  /** 0-6 (Sun-Sat). */
  daysOfWeek: ReadonlyArray<number>;
  /** HH:mm 24h. */
  open: string;
  close: string;
}

export interface GoogleBusinessListing {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: GoogleBusinessAddress;
  timezone: string;
  hours: ReadonlyArray<GoogleBusinessHours>;
  categories: ReadonlyArray<string>;
  verifiedOnGoogle: boolean;
  /** Approximate review count, surfaced to disambiguate near-duplicate names. */
  reviewCount?: number;
}

export type ImportBusinessStepData =
  | {
      provider: "google";
      account: { id: string; email: string };
      listing: GoogleBusinessListing;
      importedAt: string;
    }
  | {
      provider: "manual";
      skippedAt: string;
    };

// ── Google Calendar ─────────────────────────────────────────────────────

export type GoogleCalendarAccessRole = "OWNER" | "WRITER" | "READER" | "FREE_BUSY_READER";

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  /** Calendar's color in #RRGGBB. Data only — rendered as a small swatch. */
  colorHex: string;
  isPrimary: boolean;
  isSubscribed: boolean;
  accessRole: GoogleCalendarAccessRole;
  timezone: string;
}

export interface GoogleCalendarSyncSettings {
  readCalendarIds: ReadonlyArray<string>;
  /** May be `"create_new"` before the PATCH resolves it to a real id. */
  writeCalendarId: string | null;
}

export type ConnectCalendarStepData =
  | {
      provider: "google";
      account: { id: string; email: string };
      readCalendarIds: ReadonlyArray<string>;
      writeCalendarId: string;
      connectedAt: string;
    }
  | {
      provider: "skipped";
      skippedAt: string;
    };
