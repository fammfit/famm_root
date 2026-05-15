/**
 * GET  /api/v1/trainers/:trainerId/slots         — query materialized slots
 * POST /api/v1/trainers/:trainerId/slots/generate — trigger slot generation
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { generateSlots } from "@/lib/scheduling/scheduling-service";
import { getActiveHoldCount } from "@/lib/scheduling/booking-hold";
import { z, ZodError } from "zod";
import type { SlotStatus } from "@famm/db";

type RouteParams = { params: Promise<{ trainerId: string }> };

const QuerySchema = z.object({
  serviceId: z.string().optional(),
  from: z.string().datetime({ message: "from must be ISO 8601" }),
  to: z.string().datetime({ message: "to must be ISO 8601" }),
  status: z.enum(["AVAILABLE", "PARTIALLY_BOOKED", "FULLY_BOOKED", "CANCELLED", "BLACKOUT"]).optional(),
  timezone: z.string().default("UTC"),
  includeHoldCount: z.coerce.boolean().default(false),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { trainerId } = await params;
    const ctx = getAuthContext(request);

    const q = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const from = new Date(q.from);
    const to = new Date(q.to);

    if (to <= from) return apiError("VALIDATION_ERROR", "to must be after from", 400);
    const rangeMs = to.getTime() - from.getTime();
    if (rangeMs > 90 * 24 * 60 * 60_000) {
      return apiError("VALIDATION_ERROR", "Date range cannot exceed 90 days", 400);
    }

    const slots = await prisma.generatedSlot.findMany({
      where: {
        tenantId: ctx.tenantId,
        trainerId,
        startsAt: { gte: from, lt: to },
        ...(q.serviceId ? { serviceId: q.serviceId } : {}),
        ...(q.status ? { status: q.status as SlotStatus } : {}),
      },
      orderBy: { startsAt: "asc" },
      include: {
        service: { select: { id: true, name: true, durationMinutes: true, basePrice: true } },
      },
    });

    const enriched = await Promise.all(
      slots.map(async (slot) => {
        const holdCount = q.includeHoldCount ? await getActiveHoldCount(slot.id) : slot.holdCount;
        return {
          ...slot,
          holdCount,
          availableCapacity: Math.max(0, slot.capacity - slot.bookedCount - holdCount),
        };
      })
    );

    return apiSuccess({ slots: enriched, total: enriched.length });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid query parameters", 400, err.flatten());
    }
    return handleError(err);
  }
}
