/**
 * GET  /api/v1/trainers/:trainerId/availability  — list availability rules
 * POST /api/v1/trainers/:trainerId/availability  — upsert rules (replaces for given days)
 * DELETE /api/v1/trainers/:trainerId/availability/:id — delete a rule
 */
import { type NextRequest } from "next/server";
import { getAuthContext, assertPermission } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { z, ZodError } from "zod";
import type { DayOfWeek } from "@famm/db";

type RouteParams = { params: Promise<{ trainerId: string }> };

const AvailabilityRuleSchema = z.object({
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:MM"),
  timezone: z.string().min(1),
  serviceId: z.string().optional(),
  locationId: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

const UpsertAvailabilitySchema = z.object({
  rules: z.array(AvailabilityRuleSchema).min(1).max(50),
  /** If true, deletes existing rules for the same (dayOfWeek, serviceId) tuples */
  replace: z.boolean().default(false),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { trainerId } = await params;
    const ctx = getAuthContext(request);

    const rules = await prisma.availabilityRule.findMany({
      where: {
        tenantId: ctx.tenantId,
        trainerId,
        isActive: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return apiSuccess({ rules });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { trainerId } = await params;
    const ctx = getAuthContext(request);

    assertPermission(ctx, "availability:write");

    const body = await request.json();
    const { rules, replace } = UpsertAvailabilitySchema.parse(body);

    // Verify trainer belongs to this tenant
    const trainer = await prisma.trainerProfile.findFirst({
      where: { id: trainerId, user: { memberships: { some: { tenantId: ctx.tenantId } } } },
    });
    if (!trainer) return apiError("NOT_FOUND", "Trainer not found", 404);

    const created = await prisma.$transaction(async (tx) => {
      const result = [];
      for (const rule of rules) {
        if (replace) {
          await tx.availabilityRule.updateMany({
            where: {
              tenantId: ctx.tenantId,
              trainerId,
              dayOfWeek: rule.dayOfWeek as DayOfWeek,
              serviceId: rule.serviceId ?? null,
            },
            data: { isActive: false },
          });
        }

        const created = await tx.availabilityRule.create({
          data: {
            tenantId: ctx.tenantId,
            trainerId,
            dayOfWeek: rule.dayOfWeek as DayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            timezone: rule.timezone,
            serviceId: rule.serviceId,
            locationId: rule.locationId,
            validFrom: rule.validFrom ? new Date(rule.validFrom) : null,
            validUntil: rule.validUntil ? new Date(rule.validUntil) : null,
            isActive: true,
          },
        });
        result.push(created);
      }
      return result;
    });

    return apiSuccess({ rules: created }, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid request data", 400, zodErrorsToDetails(err));
    }
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { trainerId } = await params;
    const ctx = getAuthContext(request);

    assertPermission(ctx, "availability:write");

    const { searchParams } = request.nextUrl;
    const ruleId = searchParams.get("ruleId");
    if (!ruleId) return apiError("VALIDATION_ERROR", "ruleId query param required", 400);

    const rule = await prisma.availabilityRule.findFirst({
      where: { id: ruleId, tenantId: ctx.tenantId, trainerId },
    });
    if (!rule) return apiError("NOT_FOUND", "Rule not found", 404);

    await prisma.availabilityRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });

    return apiSuccess({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
