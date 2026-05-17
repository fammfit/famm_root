/* eslint-disable no-restricted-syntax --
 * Exception: Google Calendar colors are *data* (hex strings returned by
 * the Calendar API). They drive a small swatch dot via inline style; the
 * rest of the calendar surface is rendered with semantic tokens.
 */
import type { GoogleCalendar, GoogleCalendarSyncSettings, Integration } from "./types";

/**
 * In-memory mock store for the google_calendar integration. Separate
 * from google_business — different OAuth scope, different token, even
 * if they happen to grant access to the same Google account.
 *
 * TODO(integration-model): swap for Prisma Integration + a calendars
 * cache table.
 */

interface CalendarsBundle {
  integration: Integration;
  calendars: GoogleCalendar[];
  settings: GoogleCalendarSyncSettings;
}

const STORE = new Map<string, CalendarsBundle>();

const MOCK_EMAIL = "sarah@example.com";

const MOCK_CALENDARS_TEMPLATE: ReadonlyArray<GoogleCalendar> = [
  {
    id: "cal_primary",
    summary: "Sarah's Calendar",
    description: "Personal",
    colorHex: "#3B82F6",
    isPrimary: true,
    isSubscribed: false,
    accessRole: "OWNER",
    timezone: "America/New_York",
  },
  {
    id: "cal_family",
    summary: "Family",
    colorHex: "#10B981",
    isPrimary: false,
    isSubscribed: false,
    accessRole: "WRITER",
    timezone: "America/New_York",
  },
  {
    id: "cal_work",
    summary: "Work",
    colorHex: "#F59E0B",
    isPrimary: false,
    isSubscribed: false,
    accessRole: "WRITER",
    timezone: "America/New_York",
  },
  {
    id: "cal_holidays_us",
    summary: "US Holidays",
    description: "Subscribed",
    colorHex: "#A855F7",
    isPrimary: false,
    isSubscribed: true,
    accessRole: "READER",
    timezone: "America/New_York",
  },
];

export function getCalendarsIntegration(tenantId: string): CalendarsBundle | null {
  return STORE.get(tenantId) ?? null;
}

export function connectCalendarsIntegration(tenantId: string): CalendarsBundle {
  const existing = STORE.get(tenantId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const integration: Integration = {
    id: `igr_${tenantId}_gcal`,
    tenantId,
    provider: "google_calendar",
    status: "CONNECTED",
    externalAccountId: `g_${tenantId.slice(0, 8)}`,
    externalAccountEmail: MOCK_EMAIL,
    scopes: ["calendar.events.read", "calendar.events.write", "calendar.calendarlist.read"],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  // Pre-select the primary calendar as both read source and write target.
  const primary = MOCK_CALENDARS_TEMPLATE.find((c) => c.isPrimary);
  const bundle: CalendarsBundle = {
    integration,
    calendars: [...MOCK_CALENDARS_TEMPLATE],
    settings: {
      readCalendarIds: primary ? [primary.id] : [],
      writeCalendarId: primary ? primary.id : null,
    },
  };
  STORE.set(tenantId, bundle);
  return bundle;
}

export function disconnectCalendarsIntegration(tenantId: string): void {
  STORE.delete(tenantId);
}

export function saveCalendarSyncSettings(
  tenantId: string,
  input: {
    readCalendarIds: ReadonlyArray<string>;
    writeCalendarId: string;
    tenantName: string;
    tenantTimezone: string;
  }
): CalendarsBundle | null {
  const bundle = STORE.get(tenantId);
  if (!bundle) return null;

  let writeCalendarId = input.writeCalendarId;
  let calendars = [...bundle.calendars];

  if (writeCalendarId === "create_new") {
    const fabricatedId = `cal_famm_${tenantId.slice(0, 8)}`;
    const fammCalendar: GoogleCalendar = {
      id: fabricatedId,
      summary: `FAMM — ${input.tenantName || "Your business"}`,
      colorHex: "#6366F1",
      isPrimary: false,
      isSubscribed: false,
      accessRole: "OWNER",
      timezone:
        input.tenantTimezone || bundle.integration.lastSyncedAt
          ? (bundle.calendars[0]?.timezone ?? "UTC")
          : "UTC",
    };
    calendars = [...calendars, fammCalendar];
    writeCalendarId = fabricatedId;
  }

  // Drop any read ids that no longer exist (parity with the real API).
  const validIds = new Set(calendars.map((c) => c.id));
  const readCalendarIds = input.readCalendarIds.filter((id) => validIds.has(id));

  const next: CalendarsBundle = {
    integration: {
      ...bundle.integration,
      updatedAt: new Date().toISOString(),
    },
    calendars,
    settings: {
      readCalendarIds,
      writeCalendarId,
    },
  };
  STORE.set(tenantId, next);
  return next;
}
