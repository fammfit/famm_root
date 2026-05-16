/**
 * GET  /api/v1/blackouts  — list blocked periods
 * POST /api/v1/blackouts  — create a blocked period (optionally with RRULE)
 */
import { type NextRequest } from "next/server";
import { getAuthContext, assertPermission } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { applyBlackout } from "@/lib/scheduling/scheduling-service";
import { z, ZodError } from "zod";

const CreateBlackoutSchema = z.object({
  trainerId: z.string().optional(),
  locationId: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  timezone: z.string().default("UTC"),
  reason: z.string().max(500).optional(),
  isRecurring: z.boolean().default(false),
  /**
   * RFC 5545 RRULE string, e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20251231T000000Z"
   * Required when isRecurring=true.
   */
  recurrenceRule: z.string().optional(),
  /** When true, retroactively blackout any AVAILABLE GeneratedSlots in the range */
  blackoutExistingSlots: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);

    const { searchParams } = request.nextUrl;
    const trainerId = searchParams.get("trainerId") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const periods = await prisma.blockedPeriod.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(trainerId ? { trainerId } : {}),
        ...(from && to
          ? {
              OR: [{ startAt: { gte: new Date(from), lt: new Date(to) } }, { isRecurring: true }],
            }
          : {}),
      },
      orderBy: { startAt: "asc" },
    });

    return apiSuccess({ periods, total: periods.length });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);

    assertPermission(ctx, "availability:write");

    const body = await request.json();
    const data = CreateBlackoutSchema.parse(body);

    if (data.isRecurring && !data.recurrenceRule) {
      return apiError("VALIDATION_ERROR", "recurrenceRule is required when isRecurring=true", 400);
    }

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    if (endAt <= startAt) {
      return apiError("VALIDATION_ERROR", "endAt must be after startAt", 400);
    }

    const period = await prisma.blockedPeriod.create({
      data: {
        tenantId: ctx.tenantId,
        trainerId: data.trainerId,
        locationId: data.locationId,
        startAt,
        endAt,
        timezone: data.timezone,
        reason: data.reason,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule,
      },
    });

    // Retroactively blackout existing AVAILABLE generated slots
    let blackedOutCount = 0;
    if (data.blackoutExistingSlots && !data.isRecurring) {
      blackedOutCount = await applyBlackout(ctx.tenantId, data.trainerId ?? null, startAt, endAt);
    }

    return apiSuccess({ period, blackedOutSlots: blackedOutCount }, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid request data", 400, zodErrorsToDetails(err));
    }
    return handleError(err);
  }
}
