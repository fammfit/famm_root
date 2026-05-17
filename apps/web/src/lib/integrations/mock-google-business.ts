import type { GoogleBusinessListing, Integration } from "./types";

/**
 * In-memory mock store for the google_business integration. Replaces a
 * Prisma `Integration` row + a real Google Business Profile call until
 * the OAuth + API milestone lands.
 *
 * Keyed by tenantId. Cleared on server restart — fine for dev / preview.
 *
 * TODO(integration-model): replace with Prisma persistence + real API.
 */

const STORE = new Map<string, Integration>();

const MOCK_EMAIL = "sarah@example.com";

export function getIntegration(tenantId: string): Integration | null {
  return STORE.get(tenantId) ?? null;
}

export function connectIntegration(tenantId: string): Integration {
  const now = new Date().toISOString();
  const integration: Integration = {
    id: `igr_${tenantId}_gbiz`,
    tenantId,
    provider: "google_business",
    status: "CONNECTED",
    externalAccountId: `g_${tenantId.slice(0, 8)}`,
    externalAccountEmail: MOCK_EMAIL,
    scopes: ["business.manage.read"],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  STORE.set(tenantId, integration);
  return integration;
}

export function disconnectIntegration(tenantId: string): void {
  STORE.delete(tenantId);
}

export const MOCK_LISTINGS: ReadonlyArray<GoogleBusinessListing> = [
  {
    id: "loc_brooklyn",
    name: "Acme Strength",
    phone: "+17185550140",
    website: "https://acmestrength.fit",
    address: {
      line1: "227 Bond St",
      city: "Brooklyn",
      region: "NY",
      postalCode: "11217",
      country: "US",
    },
    timezone: "America/New_York",
    hours: [
      { daysOfWeek: [1, 2, 3, 4, 5], open: "06:00", close: "21:00" },
      { daysOfWeek: [6], open: "08:00", close: "18:00" },
    ],
    categories: ["Personal trainer", "Strength training"],
    verifiedOnGoogle: true,
    reviewCount: 47,
  },
  {
    id: "loc_manhattan",
    name: "Acme Pop-up",
    phone: "+12125550141",
    website: null,
    address: {
      line1: "510 Park Ave",
      city: "New York",
      region: "NY",
      postalCode: "10022",
      country: "US",
    },
    timezone: "America/New_York",
    hours: [{ daysOfWeek: [2, 4], open: "07:00", close: "11:00" }],
    categories: ["Personal trainer"],
    verifiedOnGoogle: false,
    reviewCount: 0,
  },
  {
    id: "loc_queens",
    name: "Acme Outdoor",
    phone: "+17185550142",
    website: "https://acmestrength.fit/outdoor",
    address: {
      line1: "Forest Park · Meet at Pine Grove",
      city: "Queens",
      region: "NY",
      postalCode: "11385",
      country: "US",
    },
    timezone: "America/New_York",
    hours: [{ daysOfWeek: [0, 6], open: "08:00", close: "11:00" }],
    categories: ["Personal trainer", "Outdoor fitness"],
    verifiedOnGoogle: true,
    reviewCount: 12,
  },
];

export function listMockListings(query?: string): GoogleBusinessListing[] {
  if (!query || query.trim() === "") return [...MOCK_LISTINGS];
  const q = query.trim().toLowerCase();
  return MOCK_LISTINGS.filter((l) =>
    [l.name, l.address.city, l.address.region].join(" ").toLowerCase().includes(q)
  );
}
