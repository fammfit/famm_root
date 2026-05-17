/**
 * @page Verify SMS code (/verify/sms)
 *
 * Purpose: enter the 6-digit code that was just texted to the user.
 * Primary user: anyone who picked "Phone" on /login.
 * Core actions: enter code, submit (auto on 6 digits is a future polish),
 *   resend code (rate-limited with a 30s cooldown).
 * UI sections: AuthShell header, OTP input field with one-time-code
 *   autocomplete, submit button, resend link.
 * Empty state: n/a.
 * Loading state: submit button enters loading; resend button shows
 *   "Sending…" then "Sent — check your phone".
 * Error state: inline — wrong code, expired, max attempts, rate-limited.
 * Mobile layout: centered card; inputmode="numeric" + autoComplete="one-
 *   time-code" surfaces the OS's auto-fill suggestion from the SMS toast.
 * Required data: query params — `phone` (required, prefilled from /login),
 *   `tenant` (slug), `next` (post-verify redirect path).
 * Related components: AuthShell, OtpForm (client), FormField, Input.
 * Route: /verify/sms (public — added to middleware PUBLIC_PATHS).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layouts/AuthShell";
import { OtpForm } from "@/components/auth/OtpForm";
import { resolveTenantSlugFromSearchParams } from "@/lib/auth/tenant-slug";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify code — FAMM",
};

interface PageProps {
  searchParams?: Record<string, string | undefined>;
}

export default function VerifySmsPage({ searchParams }: PageProps) {
  const phone = searchParams?.phone?.trim();
  const tenantSlug = resolveTenantSlugFromSearchParams(searchParams ?? {});
  const next =
    typeof searchParams?.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : undefined;

  if (!phone || !tenantSlug) {
    // Either an arrival without context (deep link with no phone) or a
    // single-tenant install with no default set. Punt back to /login.
    redirect("/login");
  }

  return (
    <AuthShell
      title="Enter your code"
      subtitle="We just texted a 6-digit verification code."
      footer={
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Wrong number? Start over
        </Link>
      }
    >
      <OtpForm phone={phone} tenantSlug={tenantSlug} next={next} />
    </AuthShell>
  );
}
