"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import { Card, FormField, Input, Sheet, SheetHeader, SheetBody } from "@famm/ui";
import { SlugPicker } from "@/components/profile-public/SlugPicker";
import { BioField } from "@/components/profile-public/BioField";
import { SpecialtyChips } from "@/components/profile-public/SpecialtyChips";
import { PhotoGallery } from "@/components/profile-public/PhotoGallery";
import {
  SocialLinksEditor,
  type SocialLinksValue,
} from "@/components/profile-public/SocialLinksEditor";
import { PublicProfilePreview } from "@/components/profile-public/PublicProfilePreview";
import { useOnboardingStep } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import { BusinessApiError, checkSlugAvailability, updateTenantBundle } from "@/lib/api/business";
import { PublicProfileSchema, suggestSlug } from "@/lib/onboarding/public-profile-schema";
import { trackEvent } from "@/lib/api/events";
import type { TenantBundle } from "@/lib/business/types";

interface PublicProfileFormProps {
  initial: TenantBundle;
  firstName: string;
  baseUrl: string;
}

interface FormState {
  slug: string;
  headline: string;
  bioMd: string;
  specialties: string[];
  gallery: string[];
  social: SocialLinksValue;
}

type Errors = Partial<{
  slug: string;
  headline: string;
  bioMd: string;
  specialties: string;
  gallery: string;
  summary: string;
}>;

function buildInitial(
  bundle: TenantBundle,
  firstName: string
): { state: FormState; suggestion: string } {
  const t = bundle.tenant;
  const b = bundle.branding;
  const s = bundle.settings;
  const suggestion = suggestSlug(t.name || "your-business", t.id);
  const defaultBio = firstName
    ? `${firstName} is a personal trainer based in ${s.addressCity || "your city"}.`
    : "";
  return {
    state: {
      slug: t.slug || suggestion,
      headline: b.headline ?? "",
      bioMd: b.bioMd ?? defaultBio,
      specialties: [...b.specialties],
      gallery: [...b.gallery],
      social: {
        instagram: b.socialInstagram,
        tiktok: b.socialTiktok,
        youtube: b.socialYoutube,
        website: b.socialWebsite,
      },
    },
    suggestion,
  };
}

export function PublicProfileForm({ initial, firstName, baseUrl }: PublicProfileFormProps) {
  const { state: initialState, suggestion } = React.useMemo(
    () => buildInitial(initial, firstName),
    [initial, firstName]
  );

  const [state, setState] = React.useState<FormState>(initialState);
  const [slugAvailable, setSlugAvailable] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const { patch } = useOnboardingProgress();

  const ownCurrentSlug = initial.tenant.slug;

  const requiredFilled =
    state.slug.length >= 3 &&
    state.headline.trim().length > 0 &&
    state.bioMd.trim().length > 0 &&
    state.specialties.length > 0 &&
    slugAvailable;

  const previewData = {
    name: initial.tenant.name || "Your business",
    slug: state.slug,
    baseUrl,
    city: initial.settings.addressCity || null,
    region: initial.settings.addressRegion || null,
    logoUrl: initial.branding.logoUrl,
    headline: state.headline,
    bioMd: state.bioMd,
    gallery: state.gallery,
    specialties: state.specialties,
    socialLinks: state.social,
  };

  const onContinue = React.useCallback(async () => {
    setErrors({});
    const parsed = PublicProfileSchema.safeParse({
      slug: state.slug,
      headline: state.headline.trim(),
      bioMd: state.bioMd.trim(),
      specialties: state.specialties,
      gallery: state.gallery,
      socialInstagram: state.social.instagram,
      socialTiktok: state.social.tiktok,
      socialYoutube: state.social.youtube,
      socialWebsite: state.social.website,
    });
    if (!parsed.success) {
      const e: Errors = {};
      for (const issue of parsed.error.errors) {
        const key = issue.path[0] as keyof Errors | undefined;
        if (key) e[key] = issue.message;
      }
      setErrors(e);
      return false;
    }

    // Race window: re-check just before save.
    if (parsed.data.slug !== ownCurrentSlug) {
      try {
        const av = await checkSlugAvailability(parsed.data.slug);
        if (!av.available) {
          setErrors({ slug: "Just taken — pick another" });
          setSlugAvailable(false);
          trackEvent({
            name: "public_profile.slug.checked",
            payload: { available: false, reason: av.reason ?? "taken" },
          });
          return false;
        }
      } catch {
        setErrors({ slug: "Couldn't verify — try again" });
        return false;
      }
    }

    try {
      await updateTenantBundle({
        tenant: { slug: parsed.data.slug },
        branding: {
          headline: parsed.data.headline,
          bioMd: parsed.data.bioMd,
          gallery: parsed.data.gallery,
          specialties: parsed.data.specialties,
          socialInstagram: parsed.data.socialInstagram,
          socialTiktok: parsed.data.socialTiktok,
          socialYoutube: parsed.data.socialYoutube,
          socialWebsite: parsed.data.socialWebsite,
        },
      });
      const snapshot = {
        slug: parsed.data.slug,
        headline: parsed.data.headline,
        bioMd: parsed.data.bioMd,
        gallery: parsed.data.gallery,
        specialties: parsed.data.specialties,
        socialLinks: {
          instagram: parsed.data.socialInstagram,
          tiktok: parsed.data.socialTiktok,
          youtube: parsed.data.socialYoutube,
          website: parsed.data.socialWebsite,
        },
        completedAt: new Date().toISOString(),
      };
      await patch("public-profile", snapshot as unknown as Record<string, unknown>);
      trackEvent({ name: "public_profile.saved" });
      return true;
    } catch (err) {
      if (err instanceof BusinessApiError) {
        setErrors({ summary: err.message });
      } else {
        setErrors({ summary: "Couldn't save — check your connection and try again." });
      }
      return false;
    }
  }, [state, ownCurrentSlug, patch]);

  useOnboardingStep("public-profile", {
    onContinue,
    continueDisabled: !requiredFilled,
    dirty: true,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onContinue();
      }}
      className="flex flex-col gap-stack-lg lg:flex-row lg:items-start"
      noValidate
    >
      <div className="flex flex-1 flex-col gap-stack-lg">
        <div className="flex flex-wrap items-center justify-between gap-inline-sm">
          <p className="text-sm text-text-secondary">
            This is what someone sees in the two seconds after they tap your booking link.
          </p>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-9 items-center gap-inline-xs rounded-control border border-border bg-surface px-inset-sm text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
          >
            <Eye aria-hidden className="h-3 w-3" />
            Preview
          </button>
        </div>

        <section aria-labelledby="link-heading" className="flex flex-col gap-stack-sm">
          <h2 id="link-heading" className="sr-only">
            Your booking link
          </h2>
          <SlugPicker
            value={state.slug}
            suggestion={suggestion}
            ownCurrentSlug={ownCurrentSlug}
            basePrefix={baseUrl}
            onChange={(slug) => setState((p) => ({ ...p, slug }))}
            onAvailabilityChange={setSlugAvailable}
          />
          {errors.slug ? (
            <p role="alert" className="text-sm text-signal-danger">
              {errors.slug}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="headline-heading" className="flex flex-col gap-stack-sm">
          <h2 id="headline-heading" className="text-sm font-semibold text-text-primary">
            Headline
          </h2>
          <FormField
            label="Headline"
            hint="A short line clients see first."
            error={errors.headline}
          >
            <Input
              name="headline"
              value={state.headline}
              maxLength={80}
              placeholder={`${initial.tenant.name || "Your business"} — Personal training`}
              onChange={(e) => setState((p) => ({ ...p, headline: e.target.value }))}
            />
          </FormField>
          <p className="self-end text-xs text-text-muted">
            {80 - state.headline.length} characters left
          </p>
        </section>

        <section aria-labelledby="bio-heading" className="flex flex-col gap-stack-sm">
          <h2 id="bio-heading" className="text-sm font-semibold text-text-primary">
            About
          </h2>
          <BioField
            value={state.bioMd}
            onChange={(v) => setState((p) => ({ ...p, bioMd: v }))}
            placeholder="A couple of sentences about how you train, what clients can expect, and where you're based."
          />
          {errors.bioMd ? (
            <p role="alert" className="text-sm text-signal-danger">
              {errors.bioMd}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="specialties-heading" className="flex flex-col gap-stack-sm">
          <h2 id="specialties-heading" className="text-sm font-semibold text-text-primary">
            Specialties
          </h2>
          <SpecialtyChips
            value={state.specialties}
            onChange={(v) => setState((p) => ({ ...p, specialties: v }))}
            {...(errors.specialties ? { error: errors.specialties } : {})}
          />
        </section>

        <section aria-labelledby="photos-heading" className="flex flex-col gap-stack-sm">
          <h2 id="photos-heading" className="text-sm font-semibold text-text-primary">
            Photos
          </h2>
          <PhotoGallery
            value={state.gallery}
            onChange={(v) => setState((p) => ({ ...p, gallery: v }))}
          />
        </section>

        <section aria-labelledby="social-heading" className="flex flex-col gap-stack-sm">
          <h2 id="social-heading" className="text-sm font-semibold text-text-primary">
            Social links
          </h2>
          <SocialLinksEditor
            value={state.social}
            onChange={(v) => setState((p) => ({ ...p, social: v }))}
          />
        </section>

        <section aria-labelledby="featured-heading" className="flex flex-col gap-stack-sm">
          <h2 id="featured-heading" className="text-sm font-semibold text-text-primary">
            Featured services
          </h2>
          <Card className="border-dashed bg-surface-sunken p-inset-md">
            <p className="text-sm text-text-secondary">
              You&rsquo;ll add services in a later step. They&rsquo;ll appear here automatically.
            </p>
          </Card>
        </section>

        <section aria-labelledby="reviews-heading" className="flex flex-col gap-stack-sm">
          <h2 id="reviews-heading" className="text-sm font-semibold text-text-primary">
            Reviews
          </h2>
          <Card className="border-dashed bg-surface-sunken p-inset-md">
            <p className="text-sm text-text-secondary">
              Reviews appear after your first 3 sessions.
            </p>
          </Card>
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
      </div>

      <aside
        aria-label="Live preview"
        className="hidden w-96 shrink-0 lg:sticky lg:top-24 lg:block"
      >
        <PublicProfilePreview data={previewData} />
      </aside>

      <Sheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        ariaLabelledBy="preview-title"
      >
        <SheetHeader
          title="Live preview"
          description="This is what clients will see."
          onClose={() => setPreviewOpen(false)}
          titleId="preview-title"
        />
        <SheetBody>
          <PublicProfilePreview data={previewData} />
        </SheetBody>
      </Sheet>
    </form>
  );
}
