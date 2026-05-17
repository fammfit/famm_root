export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface OperatingHourEntry {
  dayOfWeek: DayOfWeek;
  /** HH:MM 24-hour. */
  open: string;
  /** HH:MM 24-hour. */
  close: string;
}

export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
}

export interface TenantBrandingRecord {
  tenantId: string;
  logoUrl: string | null;
  primaryColor: string;
  faviconUrl: string | null;
  // Step 4 — Public Profile (TODO(profile-fields): real Prisma columns).
  headline: string | null;
  bioMd: string | null;
  gallery: ReadonlyArray<string>;
  socialInstagram: string | null;
  socialTiktok: string | null;
  socialYoutube: string | null;
  socialWebsite: string | null;
  specialties: ReadonlyArray<string>;
}

export interface TenantSettingsRecord {
  tenantId: string;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string;
  addressRegion: string;
  addressPostalCode: string;
  businessPhone: string | null;
  businessEmail: string | null;
  taxIdentifier: string | null;
  businessCategory: string | null;
  operatingHours: ReadonlyArray<OperatingHourEntry>;
}

export interface TenantBundle {
  tenant: TenantRecord;
  branding: TenantBrandingRecord;
  settings: TenantSettingsRecord;
}

export interface UpdateTenantInput {
  tenant?: Partial<
    Pick<
      TenantRecord,
      "name" | "legalName" | "slug" | "country" | "currency" | "locale" | "timezone"
    >
  >;
  branding?: Partial<
    Pick<
      TenantBrandingRecord,
      | "logoUrl"
      | "primaryColor"
      | "headline"
      | "bioMd"
      | "gallery"
      | "socialInstagram"
      | "socialTiktok"
      | "socialYoutube"
      | "socialWebsite"
      | "specialties"
    >
  >;
  settings?: Partial<Omit<TenantSettingsRecord, "tenantId">>;
}

export interface BusinessInfoStepData {
  tenant: {
    name: string;
    legalName: string | null;
    country: string;
    currency: string;
    locale: string;
    timezone: string;
  };
  settings: {
    addressLine1: string;
    addressLine2: string | null;
    addressCity: string;
    addressRegion: string;
    addressPostalCode: string;
    businessPhone: string | null;
    businessEmail: string | null;
    taxIdentifier: string | null;
    businessCategory: string | null;
    operatingHours: ReadonlyArray<OperatingHourEntry>;
  };
  branding: {
    logoUrl: string | null;
    primaryColor: string;
  };
  prefilledFromGoogle: ReadonlyArray<string>;
  editedAfterPrefill: ReadonlyArray<string>;
  completedAt: string;
}
