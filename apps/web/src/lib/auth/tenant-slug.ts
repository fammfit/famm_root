/**
 * Tenant slug resolution for unauthenticated surfaces (/login, /verify/sms,
 * /auth/magic-link).
 *
 * Resolution order:
 *   1. Explicit `?tenant=` query param (deep links from invites / emails).
 *   2. NEXT_PUBLIC_DEFAULT_TENANT_SLUG env var (single-tenant deployments).
 *   3. null — the page must ask the user to provide one.
 *
 * Subdomain-based resolution (`{slug}.app.famm.fit`) is intentionally
 * deferred to the marketing-landing milestone; it would need a host check
 * in middleware that we don't have wired yet.
 */
export function resolveTenantSlugFromSearchParams(
  searchParams: Readonly<URLSearchParams> | Record<string, string | undefined>
): string | null {
  const fromQuery =
    typeof (searchParams as URLSearchParams).get === "function"
      ? (searchParams as URLSearchParams).get("tenant")
      : ((searchParams as Record<string, string | undefined>).tenant ?? null);

  if (fromQuery && fromQuery.trim().length > 0) {
    return fromQuery.trim().toLowerCase();
  }

  const fallback = process.env["NEXT_PUBLIC_DEFAULT_TENANT_SLUG"];
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim().toLowerCase();
  }

  return null;
}
