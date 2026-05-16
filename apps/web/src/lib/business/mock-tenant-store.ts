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
