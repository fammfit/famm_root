import type {
  TenantBundle,
  TenantBrandingRecord,
  TenantRecord,
  TenantSettingsRecord,
  UpdateTenantInput,
} from "./types";

/**
 * In-memory mock store for the trainer's Tenant + branding + settings
 * triple. Mirrors the eventual Prisma writes so the UI flow is testable
 * end-to-end during the integration-model milestone.
 *
 * TODO(tenant-model): swap for real Prisma reads/writes against Tenant,
 * TenantBranding, and TenantSettings.
 */

const STORE = new Map<string, TenantBundle>();

// Default brand color (slate-900). This file is *data*; brand color
// flows through state as a string and is never embedded as a Tailwind
// utility — see BrandColorPicker.tsx for the only render site.
// eslint-disable-next-line no-restricted-syntax
const DEFAULT_PRIMARY_COLOR = "#0F172A";

function seed(tenantId: string): TenantBundle {
  const slug = `tenant-${tenantId.slice(0, 8)}`;
  const tenant: TenantRecord = {
    id: tenantId,
    slug,
    name: "",
    legalName: null,
    country: "",
    currency: "",
    locale: "en-US",
    timezone: "UTC",
  };
  const branding: TenantBrandingRecord = {
    tenantId,
    logoUrl: null,
    primaryColor: DEFAULT_PRIMARY_COLOR,
    faviconUrl: null,
    headline: null,
    bioMd: null,
    gallery: [],
    socialInstagram: null,
    socialTiktok: null,
    socialYoutube: null,
    socialWebsite: null,
    specialties: [],
  };
  const settings: TenantSettingsRecord = {
    tenantId,
    addressLine1: "",
    addressLine2: null,
    addressCity: "",
    addressRegion: "",
    addressPostalCode: "",
    businessPhone: null,
    businessEmail: null,
    taxIdentifier: null,
    businessCategory: null,
    operatingHours: [],
  };
  const bundle: TenantBundle = { tenant, branding, settings };
  STORE.set(tenantId, bundle);
  return bundle;
}

export function getBundle(tenantId: string): TenantBundle {
  return STORE.get(tenantId) ?? seed(tenantId);
}

export function updateBundle(tenantId: string, input: UpdateTenantInput): TenantBundle {
  const current = getBundle(tenantId);
  const tenant: TenantRecord = {
    ...current.tenant,
    ...input.tenant,
  };
  const branding: TenantBrandingRecord = {
    ...current.branding,
    ...input.branding,
  };
  const settings: TenantSettingsRecord = {
    ...current.settings,
    ...input.settings,
    tenantId,
  };
  const next: TenantBundle = { tenant, branding, settings };
  STORE.set(tenantId, next);
  return next;
}

/**
 * Slug uniqueness for the stub. Treats every claimed slug across all
 * tenants in the store + a small demo set as "taken". The trainer's own
 * current slug is always available to itself (callers filter that out).
 */
const MOCK_TAKEN_SLUGS: ReadonlySet<string> = new Set(["acme", "maya"]);

export function isSlugTaken(slug: string, ownTenantId: string): boolean {
  const normalized = slug.toLowerCase();
  if (MOCK_TAKEN_SLUGS.has(normalized)) return true;
  for (const [tenantId, bundle] of STORE.entries()) {
    if (tenantId === ownTenantId) continue;
    if (bundle.tenant.slug.toLowerCase() === normalized) return true;
  }
  return false;
}
