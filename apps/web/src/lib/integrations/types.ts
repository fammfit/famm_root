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
