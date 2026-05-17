/**
 * GET   /api/v1/tenants/me  — read the trainer's Tenant + branding + settings
 * PATCH /api/v1/tenants/me  — update any of the three slices
 *
 * STUB. Backed by an in-memory store; eventual implementation persists to
 * the Tenant / TenantBranding / TenantSettings Prisma models.
 * TODO(tenant-model): wire to Prisma and the real settings persistence.
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";
import { getBundle, updateBundle } from "@/lib/business/mock-tenant-store";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

const HoursEntrySchema = z.object({
  dayOfWeek: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const UpdateSchema = z
  .object({
    tenant: z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        legalName: z.string().trim().max(200).nullable().optional(),
        slug: z
          .string()
          .trim()
          .regex(/^[a-z][a-z0-9-]{2,29}$/)
          .optional(),
        country: z.string().length(2).optional(),
        currency: z.string().length(3).optional(),
        locale: z.string().min(2).max(15).optional(),
        timezone: z.string().min(1).max(64).optional(),
      })
      .optional(),
    branding: z
      .object({
        logoUrl: z.string().url().nullable().optional(),
        primaryColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        headline: z.string().trim().max(80).nullable().optional(),
        bioMd: z.string().trim().max(500).nullable().optional(),
        gallery: z.array(z.string().url()).max(6).optional(),
        socialInstagram: z.string().url().nullable().optional(),
        socialTiktok: z.string().url().nullable().optional(),
        socialYoutube: z.string().url().nullable().optional(),
        socialWebsite: z.string().url().nullable().optional(),
        specialties: z.array(z.string().trim().min(1).max(32)).max(6).optional(),
      })
      .optional(),
    settings: z
      .object({
        addressLine1: z.string().trim().max(200).optional(),
        addressLine2: z.string().trim().max(200).nullable().optional(),
        addressCity: z.string().trim().max(120).optional(),
        addressRegion: z.string().trim().max(120).optional(),
        addressPostalCode: z.string().trim().max(20).optional(),
        businessPhone: z
          .string()
          .regex(/^\+?[1-9]\d{6,19}$/)
          .nullable()
          .optional(),
        businessEmail: z.string().email().nullable().optional(),
        taxIdentifier: z.string().trim().max(64).nullable().optional(),
        businessCategory: z.string().trim().max(64).nullable().optional(),
        operatingHours: z.array(HoursEntrySchema).optional(),
      })
      .optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Tenant settings are for owners", 403);
    }
    const bundle = getBundle(ctx.tenantId);
    return apiSuccess(bundle);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Tenant settings are for owners", 403);
    }
    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid update", 422, zodErrorsToDetails(parsed.error));
    }
    const bundle = updateBundle(ctx.tenantId, parsed.data);
    return apiSuccess(bundle);
  } catch (err) {
    return handleError(err);
  }
}
