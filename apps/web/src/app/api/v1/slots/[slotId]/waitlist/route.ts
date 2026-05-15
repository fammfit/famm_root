/**
 * GET    /api/v1/slots/:slotId/waitlist  — list waitlist (trainer/admin only)
 * POST   /api/v1/slots/:slotId/waitlist  — join waitlist
 * DELETE /api/v1/slots/:slotId/waitlist  — leave waitlist
 */
import { type NextRequest } from "next/server";
import { getAuthContext, assertPermission } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import {
  joinSlotWaitlist,
  leaveSlotWaitlist,
  getSlotWaitlist,
  getSlotWaitlistPosition,
} from "@/lib/scheduling/scheduling-service";

type RouteParams = { params: Promise<{ slotId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    // Clients can only see their own position; trainers/admins see full list
    const canSeeAll = ["TRAINER", "TRAINER_LEAD", "TENANT_ADMIN", "TENANT_OWNER", "SUPER_ADMIN"].includes(
      ctx.userRole
    );

    if (!canSeeAll) {
      const position = await getSlotWaitlistPosition(slotId, ctx.userId);
      return apiSuccess({ position, onWaitlist: position !== null });
    }

    const waitlist = await getSlotWaitlist(slotId);
    return apiSuccess({ waitlist, total: waitlist.length });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    const slot = await prisma.generatedSlot.findFirst({
      where: { id: slotId, tenantId: ctx.tenantId },
      select: { status: true, capacity: true, bookedCount: true },
    });

    if (!slot) return apiError("NOT_FOUND", "Slot not found", 404);
    if (slot.status === "CANCELLED") {
      return apiError("SLOT_CANCELLED", "Cannot join waitlist for a cancelled slot", 409);
    }
    if (slot.bookedCount < slot.capacity) {
      return apiError("SLOT_AVAILABLE", "Slot still has capacity — book directly", 409);
    }

    const result = await joinSlotWaitlist(slotId, ctx.userId, ctx.tenantId);

    return apiSuccess({ position: result.position, entryId: result.entryId }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params;
    const ctx = getAuthContext(request);

    await leaveSlotWaitlist(slotId, ctx.userId);

    return apiSuccess({ left: true });
  } catch (err) {
    return handleError(err);
  }
}
