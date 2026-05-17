/**
 * @page Onboarding Step 3 — Business Info
 *   (/trainer/onboarding/trainer-onboarding-flow/business-info)
 *
 * Purpose: canonical record of the trainer's operational and legal
 *   identity. Writes to Tenant + TenantBranding + TenantSettings. The
 *   foundation every downstream surface depends on: Stripe Connect, SMS
 *   sender, public booking page header, invoice headers.
 * Primary user: TENANT_OWNER / TENANT_ADMIN.
 * Core actions: fill the form, upload a logo, pick a brand color, save
 *   and continue. Optional: restore prefilled values from the Google
 *   import (Step 2).
 * UI sections: Imported-from-Google banner (conditional), About, Where
 *   you operate, Money, Contact, Hours, Branding.
 * Empty state: n/a — a tenant always exists for the trainer.
 * Loading state: server-rendered prefill; form paints fully on first
 *   render. Submit loads via the shell's Continue.
 * Error state: per-field via FormField; cross-field via the role="alert"
 *   summary block.
 * Mobile layout: single column. City/Region/Postal row collapses to one
 *   column under md. Shell sticky footer carries Back/Continue (Skip is
 *   hidden — required step).
 * Required data: TenantBundle (tenant, branding, settings), plus the
 *   Step 2 import slice from OnboardingProgress.stepData.
 * Related components: BusinessInfoForm, LogoUploader, CountrySelect,
 *   CurrencyPicker, OperatingHoursEditor, BrandColorPicker,
 *   ImportedFromGoogleBanner, TimezoneSelect.
 * Route: /trainer/onboarding/trainer-onboarding-flow/business-info
 *   (trainer-only — gated by the (onboarding) route group).
 */

import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { getStep } from "@/lib/onboarding/steps";
import { getRequestContext } from "@/lib/request-context";
import { getBundle } from "@/lib/business/mock-tenant-store";
import { getOrCreateProgress } from "@/lib/onboarding/mock-progress";
import { prisma } from "@/lib/db";
import { BusinessInfoForm } from "./business-info-form";
import type { ImportBusinessStepData } from "@/lib/integrations/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your business basics — FAMM",
};

function readImportedStepData(raw: unknown): ImportBusinessStepData | null {
  if (!raw || typeof raw !== "object") return null;
  const provider = (raw as { provider?: unknown }).provider;
  if (provider === "google" || provider === "manual") {
    return raw as ImportBusinessStepData;
  }
  return null;
}

export default async function BusinessInfoPage() {
  const ctx = getRequestContext();
  const step = getStep("business-info");

  const [bundle, progress, user] = await Promise.all([
    Promise.resolve(getBundle(ctx.tenantId)),
    Promise.resolve(getOrCreateProgress(ctx.tenantId, ctx.userId)),
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { timezone: true },
    }),
  ]);

  const imported = readImportedStepData(progress.stepData["import-business"]);
  const defaultTimezone = bundle.tenant.timezone || user?.timezone || "UTC";

  return (
    <OnboardingStepBody>
      <header className="flex flex-col gap-stack-xs">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Step {step.index} of 7
        </p>
        <h1 tabIndex={-1} className="text-2xl font-semibold text-text-primary md:text-3xl">
          {step.title}
        </h1>
      </header>
      <BusinessInfoForm initial={bundle} imported={imported} defaultTimezone={defaultTimezone} />
    </OnboardingStepBody>
  );
}
