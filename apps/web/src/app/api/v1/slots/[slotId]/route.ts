/**
 * GET    /api/v1/slots/:slotId  — slot detail with live hold count
 * DELETE /api/v1/slots/:slotId  — cancel a slot (admin)
 */
import { type NextRequest } from "next/server";
import { getAuthContext, assertPermission } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { getActiveHoldCount } from "@/lib/scheduling/booking-hold";
import { cancelSlot } from "@/lib/scheduling/scheduling-service";
import { z, ZodError } from "zod";

type RouteParams = { params: Promise<{ slotId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    const slot = await prisma.generatedSlot.findFirst({
      where: { id: slotId, tenantId: ctx.tenantId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            basePrice: true,
            currency: true,
            type: true,
          },
        },
        trainer: {
          select: { id: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
        location: { select: { id: true, name: true, address: true, isVirtual: true } },
        waitlist: {
          select: { userId: true, position: true, notifiedAt: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!slot) return apiError("NOT_FOUND", "Slot not found", 404);

    const activeHoldCount = await getActiveHoldCount(slotId);
    const availableCapacity = Math.max(0, slot.capacity - slot.bookedCount - activeHoldCount);

    return apiSuccess({
      slot: {
        ...slot,
        holdCount: activeHoldCount,
        availableCapacity,
        waitlistCount: slot.waitlist.length,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

const CancelSchema = z.object({ reason: z.string().max(500).optional() });

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    assertPermission(ctx, "booking:cancel:any");

    const body = await request.json().catch(() => ({}));
    const { reason } = CancelSchema.parse(body);

    const slot = await prisma.generatedSlot.findFirst({
      where: { id: slotId, tenantId: ctx.tenantId },
    });
    if (!slot) return apiError("NOT_FOUND", "Slot not found", 404);

    await cancelSlot(slotId, ctx.tenantId, reason);

    return apiSuccess({ cancelled: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid request data", 400, err.flatten());
    }
    return handleError(err);
  }
}
