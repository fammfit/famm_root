/**
 * @page Onboarding Step 1 — Trainer Info
 *   (/trainer/onboarding/trainer-onboarding-flow/trainer-info)
 *
 * Purpose: collect the trainer's identity (name, email/phone, photo,
 *   timezone, password). The first required step of the 7-step flow.
 * Primary user: TENANT_OWNER / TENANT_ADMIN.
 * Core actions: edit fields, verify phone (inline Sheet w/ OtpForm),
 *   upload/remove photo, set/change password, Save and continue (via
 *   the shell's Continue button).
 * UI sections: spec hint (sub), AvatarUploader, name fields,
 *   read-only email + verification pill, phone + verification pill,
 *   TimezoneSelect, password disclosure (collapsible).
 * Empty state: n/a — a User row always exists for the signed-in trainer.
 * Loading state: server-rendered prefill; the form renders fully on
 *   first paint. Submits load via the shell's Continue.
 * Error state: per-field errors via FormField; cross-field via the
 *   role="alert" summary block.
 * Mobile layout: single column. Names stack to two columns at md+.
 *   No bottom-tab nav (the onboarding shell suppresses it).
 * Required data: User (firstName, lastName, email, phone,
 *   emailVerified, phoneVerified, avatarUrl, timezone, passwordHash);
 *   Tenant.slug (for the SMS verify call).
 * Related components: OnboardingStepBody, TrainerInfoForm,
 *   AvatarUploader, TimezoneSelect, VerificationBadge, Sheet, OtpForm.
 * Route: /trainer/onboarding/trainer-onboarding-flow/trainer-info
 *   (trainer-only — gated by the (onboarding) route group).
 */

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRequestContext } from "@/lib/request-context";
import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { getStep } from "@/lib/onboarding/steps";
import { TrainerInfoForm } from "./trainer-info-form";
import type { UserRole } from "@famm/types";
import type { MeUser } from "@/lib/api/profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tell us about you — FAMM",
};

export default async function TrainerInfoPage() {
  const ctx = getRequestContext();
  const step = getStep("trainer-info");

  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        timezone: true,
        emailVerified: true,
        phoneVerified: true,
        status: true,
        passwordHash: true,
        memberships: {
          where: { tenantId: ctx.tenantId },
          select: { role: true, permissions: true },
        },
      },
    }),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { slug: true },
    }),
  ]);

  if (!user || !tenant) {
    // The route-group layout already enforced auth; a missing row here
    // means the user's row was deleted out from under them. Send them
    // back to /login to re-bootstrap.
    redirect("/login?next=/trainer/onboarding/trainer-onboarding-flow/trainer-info");
  }

  const membership = user.memberships[0];
  const initialUser: MeUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone || resolveServerDefaultTimezone(),
    emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
    phoneVerified: user.phoneVerified ? user.phoneVerified.toISOString() : null,
    status: user.status,
    role: (membership?.role ?? ctx.userRole) as UserRole,
    tenantId: ctx.tenantId,
    hasPassword: Boolean(user.passwordHash),
  };

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
      <TrainerInfoForm initialUser={initialUser} tenantSlug={tenant.slug} />
    </OnboardingStepBody>
  );
}

function resolveServerDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
