/**
 * @page Magic-link landing (/auth/magic-link)
 *
 * Purpose: the URL embedded in the magic-link email. Verifies the token,
 *   sets session cookies via the API, then routes to / (which itself
 *   redirects by role).
 * Primary user: anyone clicking a magic link from their inbox.
 * Core actions: none — the page is an automated transition. The user only
 *   takes action when something fails.
 * UI sections: AuthShell header, MagicLinkLanding (spinner → success →
 *   error state).
 * Empty state: n/a — the URL must carry token/email/tenant.
 * Loading state: inline spinner with "Signing you in…".
 * Error state: ErrorState L2 with helpful copy ("link expired", "link
 *   already used") and a back-to-sign-in escape hatch.
 * Mobile layout: centered card; nothing else on screen — the user just
 *   tapped a link in Mail and should land somewhere obvious.
 * Required data: query params — `token`, `email`, `tenant`. All required.
 *   buildMagicLinkUrl (lib/auth/magic-link.ts) emits this URL.
 * Related components: AuthShell, MagicLinkLanding (client), Spinner,
 *   ErrorState.
 * Route: /auth/magic-link (public — added to middleware PUBLIC_PATHS).
 */

import { AuthShell } from "@/components/layouts/AuthShell";
import { MagicLinkLanding } from "@/components/auth/MagicLinkLanding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Signing you in — FAMM",
};

interface PageProps {
  searchParams?: Record<string, string | undefined>;
}

export default function MagicLinkLandingPage({ searchParams }: PageProps) {
  const token = searchParams?.token?.trim() ?? null;
  const email = searchParams?.email?.trim() ?? null;
  const tenant = searchParams?.tenant?.trim() ?? null;

  return (
    <AuthShell title="One moment" subtitle="Confirming your sign-in.">
      <MagicLinkLanding token={token} email={email} tenant={tenant} />
    </AuthShell>
  );
}
