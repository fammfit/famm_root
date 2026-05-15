import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestContext } from "@/lib/request-context";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { UpdateBookingSchema, ROLE_HIERARCHY } from "@famm/shared";
import { publishEvent } from "@/lib/booking/realtime";
import { nextWaiter } from "@/lib/booking/waitlist";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = getRequestContext();

    const booking = await prisma.booking.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: {
        service: true,
        trainer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        location: true,
        reminders: true,
      },
    });

    if (!booking) return apiError("NOT_FOUND", "Booking not found", 404);

    if (ctx.userRole === "CLIENT" && booking.clientId !== ctx.userId) {
      return apiError("FORBIDDEN", "Forbidden", 403);
    }

    return apiSuccess(booking);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = getRequestContext();
    const body = (await request.json()) as unknown;
    const input = UpdateBookingSchema.parse(body);

    const booking = await prisma.booking.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });

    if (!booking) return apiError("NOT_FOUND", "Booking not found", 404);

    const isClient = ctx.userRole === "CLIENT";

    if (isClient && booking.clientId !== ctx.userId) {
      return apiError("FORBIDDEN", "Forbidden", 403);
    }

    if (isClient && input.status && input.status !== "CANCELLED") {
      return apiError("FORBIDDEN", "Clients can only cancel bookings", 403);
    }

    if (input.status === "CANCELLED" && isClient) {
      const tenantSettings = await prisma.tenantSettings.findUnique({
        where: { tenantId: ctx.tenantId },
      });
      const windowHours = tenantSettings?.cancellationWindowHours ?? 24;
      const hoursUntilStart =
        (booking.startAt.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilStart < windowHours) {
        return apiError(
          "CANCELLATION_WINDOW_EXPIRED",
          `Cannot cancel within ${windowHours} hours of the booking`,
          422
        );
      }
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        ...input,
        ...(input.status === "CANCELLED"
          ? { cancelledAt: new Date(), cancelledBy: ctx.userId }
          : {}),
      },
    });

    if (input.status === "CANCELLED") {
      await Promise.all([
        publishEvent(ctx.tenantId, {
          type: "BOOKING_CANCELLED",
          bookingId: updated.id,
          serviceId: booking.serviceId,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
        }),
        publishEvent(ctx.tenantId, {
          type: "SLOT_UPDATED",
          serviceId: booking.serviceId,
          trainerId: booking.trainerId ?? undefined,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          available: true,
        }),
      ]);

      const waiter = await nextWaiter(
        ctx.tenantId,
        booking.serviceId,
        booking.startAt.toISOString(),
        booking.trainerId ?? undefined
      );
      if (waiter) {
        await publishEvent(ctx.tenantId, {
          type: "WAITLIST_NOTIFIED",
          waitlistId: waiter.id,
          serviceId: booking.serviceId,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
        });
      }
    }

    return apiSuccess(updated);
  } catch (err) {
    return handleError(err);
  }
}
