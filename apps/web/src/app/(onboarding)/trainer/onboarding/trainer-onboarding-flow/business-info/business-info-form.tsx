"use client";

import * as React from "react";
import { FormField, Input } from "@famm/ui";
import { LogoUploader } from "@/components/business/LogoUploader";
import { CountrySelect } from "@/components/business/CountrySelect";
import { CurrencyPicker } from "@/components/business/CurrencyPicker";
import { OperatingHoursEditor } from "@/components/business/OperatingHoursEditor";
import { BrandColorPicker } from "@/components/business/BrandColorPicker";
import { TimezoneSelect } from "@/components/profile/TimezoneSelect";
import { ImportedFromGoogleBanner } from "@/components/onboarding/ImportedFromGoogleBanner";
import { useOnboardingStep } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import { BusinessApiError, updateTenantBundle } from "@/lib/api/business";
import { detectCountryFromLocale, getCountry } from "@/lib/business/countries";
import { BusinessInfoSchema } from "@/lib/onboarding/business-info-schema";
import { trackEvent } from "@/lib/api/events";
import type { ImportBusinessStepData, GoogleBusinessListing } from "@/lib/integrations/types";
import type { BusinessInfoStepData, OperatingHourEntry, TenantBundle } from "@/lib/business/types";

interface BusinessInfoFormProps {
  initial: TenantBundle;
  imported: ImportBusinessStepData | null;
  defaultTimezone: string;
}

interface FormState {
  name: string;
  legalName: string;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressRegion: string;
  addressPostalCode: string;
  businessPhone: string;
  businessEmail: string;
  taxIdentifier: string;
  businessCategory: string;
  operatingHours: OperatingHourEntry[];
  logoUrl: string | null;
  primaryColor: string;
}

type Errors = Partial<Record<keyof FormState, string>> & { summary?: string };

const CATEGORIES: ReadonlyArray<string> = [
  "Personal trainer",
  "Yoga studio",
  "Pilates",
  "Martial arts",
  "Group fitness",
  "Other",
];

function listingToHours(hours: GoogleBusinessListing["hours"]): OperatingHourEntry[] {
  const flat: OperatingHourEntry[] = [];
  for (const h of hours) {
    for (const d of h.daysOfWeek) {
      flat.push({ dayOfWeek: d as OperatingHourEntry["dayOfWeek"], open: h.open, close: h.close });
    }
  }
  flat.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return flat;
}

function buildInitial(
  bundle: TenantBundle,
  imported: ImportBusinessStepData | null,
  defaultTimezone: string
): { state: FormState; prefilled: string[] } {
  const t = bundle.tenant;
  const s = bundle.settings;
  const b = bundle.branding;

  const usingImport = imported?.provider === "google" && !t.name && !s.addressLine1;

  if (usingImport && imported && imported.provider === "google") {
    const l = imported.listing;
    const country = l.address.country.toUpperCase();
    const cEntry = getCountry(country);
    return {
      state: {
        name: l.name,
        legalName: "",
        country,
        currency: cEntry.defaultCurrency,
        locale: t.locale || (typeof navigator !== "undefined" ? navigator.language : "en-US"),
        timezone: l.timezone || defaultTimezone,
        addressLine1: l.address.line1,
        addressLine2: l.address.line2 ?? "",
        addressCity: l.address.city,
        addressRegion: l.address.region,
        addressPostalCode: l.address.postalCode,
        businessPhone: l.phone ?? "",
        businessEmail: "",
        taxIdentifier: "",
        businessCategory: l.categories[0] ?? "",
        operatingHours: listingToHours(l.hours),
        logoUrl: b.logoUrl,
        primaryColor: b.primaryColor,
      },
      prefilled: [
        "name",
        "country",
        "currency",
        "timezone",
        "addressLine1",
        "addressCity",
        "addressRegion",
        "addressPostalCode",
        l.address.line2 ? "addressLine2" : "",
        l.phone ? "businessPhone" : "",
        l.categories[0] ? "businessCategory" : "",
        l.hours.length > 0 ? "operatingHours" : "",
      ].filter((s): s is string => Boolean(s)),
    };
  }

  return {
    state: {
      name: t.name,
      legalName: t.legalName ?? "",
      country: t.country || detectCountryFromLocale(t.locale),
      currency: t.currency,
      locale: t.locale,
      timezone: t.timezone || defaultTimezone,
      addressLine1: s.addressLine1,
      addressLine2: s.addressLine2 ?? "",
      addressCity: s.addressCity,
      addressRegion: s.addressRegion,
      addressPostalCode: s.addressPostalCode,
      businessPhone: s.businessPhone ?? "",
      businessEmail: s.businessEmail ?? "",
      taxIdentifier: s.taxIdentifier ?? "",
      businessCategory: s.businessCategory ?? "",
      operatingHours: [...s.operatingHours],
      logoUrl: b.logoUrl,
      primaryColor: b.primaryColor,
    },
    prefilled: [],
  };
}

export function BusinessInfoForm({ initial, imported, defaultTimezone }: BusinessInfoFormProps) {
  const { state: initialState, prefilled } = React.useMemo(
    () => buildInitial(initial, imported, defaultTimezone),
    [initial, imported, defaultTimezone]
  );

  const [state, setState] = React.useState<FormState>(initialState);
  const [edited, setEdited] = React.useState<Set<string>>(new Set());
  const [currencyTouched, setCurrencyTouched] = React.useState(false);
  const [legalNameDetached, setLegalNameDetached] = React.useState(
    initialState.legalName.length > 0
  );
  const [errors, setErrors] = React.useState<Errors>({});
  const liveRegionRef = React.useRef<HTMLParagraphElement | null>(null);

  const { patch } = useOnboardingProgress();

  const country = getCountry(state.country);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (prefilled.includes(String(key))) {
      setEdited((prev) => {
        const next = new Set(prev);
        next.add(String(key));
        return next;
      });
    }
  }

  function handleCountryChange(next: string) {
    update("country", next);
    if (!currencyTouched) {
      const c = getCountry(next);
      update("currency", c.defaultCurrency);
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Currency set to ${c.defaultCurrency}.`;
      }
    }
  }

  function handleCurrencyChange(next: string) {
    setCurrencyTouched(true);
    update("currency", next);
  }

  function handleNameChange(next: string) {
    update("name", next);
    if (!legalNameDetached) {
      setState((prev) => ({ ...prev, legalName: next }));
    }
  }

  function handleLegalNameChange(next: string) {
    setLegalNameDetached(true);
    update("legalName", next);
  }

  function restoreFromGoogle() {
    if (!imported || imported.provider !== "google") return;
    const rebuilt = buildInitial(
      {
        ...initial,
        tenant: { ...initial.tenant, name: "" },
        settings: { ...initial.settings, addressLine1: "" },
      },
      imported,
      defaultTimezone
    );
    setState(rebuilt.state);
    setEdited(new Set());
    setCurrencyTouched(false);
    setLegalNameDetached(false);
  }

  // Validation runs at submit time and also drives the disabled button
  // state in a coarse way (at least one open day, required fields filled).
  const requiredFilled =
    state.name.trim().length > 0 &&
    state.country.length === 2 &&
    state.currency.length === 3 &&
    state.timezone.length > 0 &&
    state.addressLine1.trim().length > 0 &&
    state.addressCity.trim().length > 0 &&
    state.addressRegion.trim().length > 0 &&
    state.operatingHours.length > 0;

  const onContinue = React.useCallback(async () => {
    setErrors({});
    const parsed = BusinessInfoSchema.safeParse({
      name: state.name.trim(),
      legalName: legalNameDetached ? state.legalName.trim() || null : null,
      country: state.country,
      currency: state.currency,
      locale: state.locale,
      timezone: state.timezone,
      addressLine1: state.addressLine1.trim(),
      addressLine2: state.addressLine2.trim() || null,
      addressCity: state.addressCity.trim(),
      addressRegion: state.addressRegion.trim(),
      addressPostalCode: state.addressPostalCode.trim(),
      businessPhone: state.businessPhone.trim() || null,
      businessEmail: state.businessEmail.trim() || null,
      taxIdentifier: state.taxIdentifier.trim() || null,
      businessCategory: state.businessCategory || null,
      operatingHours: state.operatingHours,
      logoUrl: state.logoUrl,
      primaryColor: state.primaryColor,
    });
    if (!parsed.success) {
      const e: Errors = {};
      for (const issue of parsed.error.errors) {
        const key = (issue.path[0] as keyof FormState) ?? "summary";
        e[key] = issue.message;
      }
      setErrors(e);
      return false;
    }

    try {
      const saved = await updateTenantBundle({
        tenant: {
          name: parsed.data.name,
          legalName: parsed.data.legalName,
          country: parsed.data.country,
          currency: parsed.data.currency,
          locale: parsed.data.locale,
          timezone: parsed.data.timezone,
        },
        branding: {
          logoUrl: parsed.data.logoUrl,
          primaryColor: parsed.data.primaryColor,
        },
        settings: {
          addressLine1: parsed.data.addressLine1,
          addressLine2: parsed.data.addressLine2,
          addressCity: parsed.data.addressCity,
          addressRegion: parsed.data.addressRegion,
          addressPostalCode: parsed.data.addressPostalCode,
          businessPhone: parsed.data.businessPhone,
          businessEmail: parsed.data.businessEmail,
          taxIdentifier: parsed.data.taxIdentifier,
          businessCategory: parsed.data.businessCategory,
          operatingHours: parsed.data.operatingHours,
        },
      });

      const snapshot: BusinessInfoStepData = {
        tenant: {
          name: saved.tenant.name,
          legalName: saved.tenant.legalName,
          country: saved.tenant.country,
          currency: saved.tenant.currency,
          locale: saved.tenant.locale,
          timezone: saved.tenant.timezone,
        },
        settings: {
          addressLine1: saved.settings.addressLine1,
          addressLine2: saved.settings.addressLine2,
          addressCity: saved.settings.addressCity,
          addressRegion: saved.settings.addressRegion,
          addressPostalCode: saved.settings.addressPostalCode,
          businessPhone: saved.settings.businessPhone,
          businessEmail: saved.settings.businessEmail,
          taxIdentifier: saved.settings.taxIdentifier,
          businessCategory: saved.settings.businessCategory,
          operatingHours: saved.settings.operatingHours,
        },
        branding: {
          logoUrl: saved.branding.logoUrl,
          primaryColor: saved.branding.primaryColor,
        },
        prefilledFromGoogle: prefilled,
        editedAfterPrefill: Array.from(edited),
        completedAt: new Date().toISOString(),
      };

      await patch("business-info", snapshot as unknown as Record<string, unknown>);
      trackEvent({ name: "business_info.saved" });
      return true;
    } catch (err) {
      const e: Errors = {};
      if (err instanceof BusinessApiError && err.fieldErrors.length > 0) {
        for (const fe of err.fieldErrors) {
          const key = fe.field.split(".").pop() as keyof FormState;
          e[key] = fe.message;
        }
      } else if (err instanceof BusinessApiError) {
        e.summary = err.message;
      } else {
        e.summary = "Couldn't save — check your connection and try again.";
      }
      setErrors(e);
      return false;
    }
  }, [state, legalNameDetached, edited, prefilled, patch]);

  useOnboardingStep("business-info", {
    onContinue,
    continueDisabled: !requiredFilled,
    dirty: true,
  });

  const initials = state.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onContinue();
      }}
      className="flex flex-col gap-stack-lg"
      noValidate
    >
      <p className="text-sm text-text-secondary">
        This is the legal and operational identity your clients (and Stripe) will see. You can
        refine the public-facing voice on the next step.
      </p>

      {imported?.provider === "google" ? (
        <ImportedFromGoogleBanner editedCount={edited.size} onRestore={restoreFromGoogle} />
      ) : null}

      <section aria-labelledby="about-heading" className="flex flex-col gap-stack-sm">
        <h2 id="about-heading" className="text-sm font-semibold text-text-primary">
          About
        </h2>
        <FormField label="Public business name" error={errors.name}>
          <Input
            name="publicName"
            value={state.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoComplete="organization"
          />
        </FormField>
        <FormField
          label="Legal business name"
          hint="Used for invoices and Stripe. Defaults to your public name."
          error={errors.legalName}
        >
          <Input
            name="legalName"
            value={legalNameDetached ? state.legalName : state.name}
            onChange={(e) => handleLegalNameChange(e.target.value)}
          />
        </FormField>
        <FormField label="Business category">
          <select
            name="businessCategory"
            value={state.businessCategory}
            onChange={(e) => update("businessCategory", e.target.value)}
            className="h-10 w-full rounded-control border border-border bg-surface px-inset-sm text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <option value="">Pick one (optional)</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </FormField>
      </section>

      <section aria-labelledby="where-heading" className="flex flex-col gap-stack-sm">
        <h2 id="where-heading" className="text-sm font-semibold text-text-primary">
          Where you operate
        </h2>
        <FormField label="Country" error={errors.country}>
          <CountrySelect value={state.country} onChange={handleCountryChange} required />
        </FormField>
        <p ref={liveRegionRef} aria-live="polite" className="sr-only" />
        <FormField label="Address" error={errors.addressLine1}>
          <Input
            name="addressLine1"
            value={state.addressLine1}
            onChange={(e) => update("addressLine1", e.target.value)}
            autoComplete="address-line1"
            required
          />
        </FormField>
        <FormField label="Address line 2" error={errors.addressLine2}>
          <Input
            name="addressLine2"
            value={state.addressLine2}
            onChange={(e) => update("addressLine2", e.target.value)}
            autoComplete="address-line2"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-stack-sm md:grid-cols-3">
          <FormField label="City" error={errors.addressCity}>
            <Input
              name="city"
              value={state.addressCity}
              onChange={(e) => update("addressCity", e.target.value)}
              autoComplete="address-level2"
              required
            />
          </FormField>
          <FormField label={country.regionLabel} error={errors.addressRegion}>
            <Input
              name="region"
              value={state.addressRegion}
              onChange={(e) => update("addressRegion", e.target.value)}
              autoComplete="address-level1"
              required
            />
          </FormField>
          {!country.noPostal ? (
            <FormField label={country.postalLabel} error={errors.addressPostalCode}>
              <Input
                name="postalCode"
                value={state.addressPostalCode}
                onChange={(e) => update("addressPostalCode", e.target.value)}
                autoComplete="postal-code"
              />
            </FormField>
          ) : null}
        </div>
        <FormField label="Timezone" error={errors.timezone}>
          <TimezoneSelect value={state.timezone} onChange={(v) => update("timezone", v)} required />
        </FormField>
      </section>

      <section aria-labelledby="money-heading" className="flex flex-col gap-stack-sm">
        <h2 id="money-heading" className="text-sm font-semibold text-text-primary">
          Money
        </h2>
        <FormField label="Currency" error={errors.currency}>
          <CurrencyPicker value={state.currency} onChange={handleCurrencyChange} required />
        </FormField>
        <FormField label={country.taxLabel} error={errors.taxIdentifier}>
          <Input
            name="taxIdentifier"
            value={state.taxIdentifier}
            onChange={(e) => update("taxIdentifier", e.target.value)}
          />
        </FormField>
      </section>

      <section aria-labelledby="contact-heading" className="flex flex-col gap-stack-sm">
        <h2 id="contact-heading" className="text-sm font-semibold text-text-primary">
          Contact
        </h2>
        <FormField
          label="Business phone"
          hint="Distinct from your personal phone. Shown on the public booking page."
          error={errors.businessPhone}
        >
          <Input
            name="businessPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={state.businessPhone}
            onChange={(e) => update("businessPhone", e.target.value)}
            placeholder="+15551234567"
          />
        </FormField>
        <FormField label="Business email" error={errors.businessEmail}>
          <Input
            name="businessEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={state.businessEmail}
            onChange={(e) => update("businessEmail", e.target.value)}
          />
        </FormField>
      </section>

      <section aria-labelledby="hours-heading" className="flex flex-col gap-stack-sm">
        <h2 id="hours-heading" className="text-sm font-semibold text-text-primary">
          Hours
        </h2>
        <OperatingHoursEditor
          value={state.operatingHours}
          onChange={(next) => update("operatingHours", next)}
          {...(errors.operatingHours ? { error: errors.operatingHours } : {})}
        />
      </section>

      <section aria-labelledby="branding-heading" className="flex flex-col gap-stack-sm">
        <h2 id="branding-heading" className="text-sm font-semibold text-text-primary">
          Branding
        </h2>
        <FormField label="Logo">
          <LogoUploader
            value={state.logoUrl}
            onChange={(next) => update("logoUrl", next)}
            initials={initials}
          />
        </FormField>
        <FormField label="Brand color" hint="Used on receipts and your booking page later.">
          <BrandColorPicker
            value={state.primaryColor}
            onChange={(next) => update("primaryColor", next)}
            {...(errors.primaryColor ? { error: errors.primaryColor } : {})}
          />
        </FormField>
      </section>

      {errors.summary ? (
        <p
          role="alert"
          className="rounded-card border border-signal-danger/30 bg-signal-danger/10 p-inset-sm text-sm text-signal-danger"
        >
          {errors.summary}
        </p>
      ) : null}

      <button type="submit" className="sr-only">
        Save and continue
      </button>
    </form>
  );
}
