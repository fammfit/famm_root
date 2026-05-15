/**
 * POST   /api/v1/slots/:slotId/hold  — acquire a 15-min booking hold
 * DELETE /api/v1/slots/:slotId/hold  — release hold early
 * PATCH  /api/v1/slots/:slotId/hold  — extend hold TTL
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import {
  acquireSlotHold,
  releaseSlotHold,
  extendSlotHold,
  getSlotHold,
} from "@/lib/scheduling/scheduling-service";

type RouteParams = { params: Promise<{ slotId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    const slot = await prisma.generatedSlot.findFirst({
      where: { id: slotId, tenantId: ctx.tenantId },
      select: { status: true },
    });
    if (!slot) return apiError("NOT_FOUND", "Slot not found", 404);
    if (slot.status === "CANCELLED" || slot.status === "BLACKOUT") {
      return apiError("SLOT_UNAVAILABLE", "Slot is not available for booking", 409);
    }

    const result = await acquireSlotHold(slotId, ctx.userId, ctx.tenantId);

    if (!result.success) {
      return apiError("SLOT_FULL", result.reason ?? "Slot is fully booked or held", 409);
    }

    return apiSuccess(
      { holdId: result.holdId, expiresAt: result.expiresAt, slotId },
      201
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    await releaseSlotHold(slotId, ctx.userId, ctx.tenantId);

    return apiSuccess({ released: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    const holdId = await getSlotHold(slotId, ctx.userId);
    if (!holdId) {
      return apiError("HOLD_NOT_FOUND", "No active hold for this slot", 404);
    }

    const extended = await extendSlotHold(slotId, ctx.userId);
    if (!extended) {
      return apiError("HOLD_EXPIRED", "Hold has already expired", 410);
    }

    return apiSuccess({ extended: true });
  } catch (err) {
    return handleError(err);
  }
}
