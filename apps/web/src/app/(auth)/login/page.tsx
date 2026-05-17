/**
 * @page Sign in (/login)
 *
 * Purpose: single entry point for every role — trainer, staff, client.
 *   Offers a one-tap email magic link or a phone SMS code. Password
 *   sign-in is deferred to a power-user toggle in a follow-up.
 * Primary user: any returning or invited user.
 * Core actions: pick method, enter contact, submit, transition to either
 *   "check your inbox" confirmation (email) or the OTP page (phone).
 * UI sections: AuthShell header + brand mark, MethodTabs (Email | Phone),
 *   contact field, submit button, footer link to public booking.
 * Empty state: n/a — the form is the surface.
 * Loading state: submit button enters loading; the page itself is
 *   server-rendered so first paint is instant.
 * Error state: inline message under the field (validation, rate-limit,
 *   network). No global error UI — the user shouldn't lose what they typed.
 * Mobile layout: centered card, single column, large tap targets (Button
 *   size="lg" hits 48 px). Numeric / email inputmode triggers the right
 *   on-screen keyboard.
 * Required data: query params — `tenant` (slug) and `next` (post-login
 *   redirect path). Tenant falls back to NEXT_PUBLIC_DEFAULT_TENANT_SLUG
 *   then to a user-entered field.
 * Related components: AuthShell, LoginForm (client), FormField, Input,
 *   Button.
 * Route: /login (public — listed in middleware PUBLIC_PATHS).
 */

import Link from "next/link";
import { AuthShell } from "@/components/layouts/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { resolveTenantSlugFromSearchParams } from "@/lib/auth/tenant-slug";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — FAMM",
  description: "Sign in to your studio.",
};

interface PageProps {
  searchParams?: Record<string, string | undefined>;
}

export default function LoginPage({ searchParams }: PageProps) {
  const tenantSlug = resolveTenantSlugFromSearchParams(searchParams ?? {});
  const next =
    typeof searchParams?.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : undefined;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Choose how you'd like to receive your sign-in."
      footer={
        <span>
          New here?{" "}
          <Link
            href="/"
            className="font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Learn more
          </Link>
        </span>
      }
    >
      <LoginForm tenantSlug={tenantSlug} next={next} />
    </AuthShell>
  );
}
