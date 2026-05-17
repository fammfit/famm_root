/**
 * GET /api/v1/tenants/slug-available?slug=<candidate>
 *
 * STUB. Validates format + reserved + uniqueness against the in-memory
 * tenant store. Returns:
 *   { available: true }                   — free
 *   { available: false, reason: "..." }   — taken | reserved | invalid
 *
 * The requesting tenant's own current slug is always reported available.
 *
 * TODO(slug-availability): swap for a Prisma uniqueness check + a small
 * reservation window after delete so freed slugs aren't immediately
 * re-grabbable.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { getBundle, isSlugTaken } from "@/lib/business/mock-tenant-store";
import { RESERVED_SLUGS } from "@/lib/profile/specialties";
import { SLUG_REGEX } from "@/lib/onboarding/public-profile-schema";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Slug check is for tenant owners", 403);
    }
    const slug = (new URL(request.url).searchParams.get("slug") ?? "").trim().toLowerCase();
    if (!SLUG_REGEX.test(slug) || /--/.test(slug) || slug.endsWith("-")) {
      return apiSuccess({ available: false, reason: "invalid" });
    }
    if (RESERVED_SLUGS.has(slug)) {
      return apiSuccess({ available: false, reason: "reserved" });
    }
    const bundle = getBundle(ctx.tenantId);
    if (bundle.tenant.slug.toLowerCase() === slug) {
      return apiSuccess({ available: true });
    }
    if (isSlugTaken(slug, ctx.tenantId)) {
      return apiSuccess({ available: false, reason: "taken" });
    }
    return apiSuccess({ available: true });
  } catch (err) {
    return handleError(err);
  }
}
