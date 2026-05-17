/**
 * @page Onboarding Step 4 — Public Profile Info
 *   (/trainer/onboarding/trainer-onboarding-flow/public-profile)
 *
 * Purpose: configure the trainer's public-facing storefront — booking
 *   link slug, headline, bio, specialties, photo gallery, social links.
 *   The output renders at /t/{slug} for the public.
 * Primary user: TENANT_OWNER / TENANT_ADMIN (editor). Anonymous public
 *   visitors are the *audience*, not editors.
 * Core actions: pick slug (debounced availability check), write
 *   headline + bio, select specialties, upload up to 6 photos, enter
 *   social handles, preview, save and continue.
 * UI sections: SlugPicker, Headline, Bio, Specialties, Photo gallery,
 *   Social links, Featured services placeholder, Reviews placeholder.
 *   Live preview docks to a right rail on lg+ and behind a "Preview"
 *   bottom Sheet on mobile.
 * Empty state: n/a — the form is always renderable.
 * Loading state: server-rendered prefill; slug check shows a "Checking…"
 *   pill with aria-live.
 * Error state: per-field via FormField; cross-field via role="alert"
 *   summary block.
 * Mobile layout: single column; preview behind a Sheet; required step
 *   so Skip is hidden.
 * Required data: TenantBundle (read), User.firstName for default bio,
 *   NEXT_PUBLIC_APP_URL for the booking-link prefix.
 * Related components: PublicProfileForm, SlugPicker, BioField,
 *   SpecialtyChips, PhotoGallery, SocialLinksEditor,
 *   PublicProfilePreview.
 * Route: /trainer/onboarding/trainer-onboarding-flow/public-profile
 *   (trainer-only — gated by the (onboarding) route group).
 */

import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { getStep } from "@/lib/onboarding/steps";
import { getRequestContext } from "@/lib/request-context";
import { getBundle } from "@/lib/business/mock-tenant-store";
import { prisma } from "@/lib/db";
import { PublicProfileForm } from "./public-profile-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your public profile — FAMM",
};

function resolveBaseUrl(): string {
  const envUrl = process.env["NEXT_PUBLIC_APP_URL"];
  const hostname = envUrl ? envUrl.replace(/\/+$/, "") : "https://app.famm.fit";
  return `${hostname.replace(/^https?:\/\//, "").replace(/^http?:\/\//, "")}/t/`;
}

export default async function PublicProfilePage() {
  const ctx = getRequestContext();
  const step = getStep("public-profile");
  const [bundle, user] = await Promise.all([
    Promise.resolve(getBundle(ctx.tenantId)),
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true },
    }),
  ]);
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
      <PublicProfileForm
        initial={bundle}
        firstName={user?.firstName ?? ""}
        baseUrl={resolveBaseUrl()}
      />
    </OnboardingStepBody>
  );
}
