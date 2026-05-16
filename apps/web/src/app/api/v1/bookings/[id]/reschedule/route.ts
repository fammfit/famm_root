import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestContextChecked } from "@/lib/request-context";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { RescheduleBookingSchema } from "@famm/shared";
import { validateBookingRules } from "@/lib/booking/rules";
import { isSlotAvailable } from "@/lib/booking/availability";
import { publishEvent } from "@/lib/booking/realtime";
import { nextWaiter } from "@/lib/booking/waitlist";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRequestContextChecked();
    const body = (await request.json()) as unknown;
    const input = RescheduleBookingSchema.parse(body);

    const booking = await prisma.booking.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!booking) return apiError("NOT_FOUND", "Booking not found", 404);

    const isClient = ctx.userRole === "CLIENT";
    if (isClient && booking.clientId !== ctx.userId) {
      return apiError("FORBIDDEN", "Forbidden", 403);
    }

    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return apiError("INVALID_STATE", "Cannot reschedule a cancelled or completed booking", 422);
    }

    const [service, tenantSettings] = await Promise.all([
      prisma.service.findFirst({
        where: { id: booking.serviceId, tenantId: ctx.tenantId },
      }),
      prisma.tenantSettings.findUnique({ where: { tenantId: ctx.tenantId } }),
    ]);
    if (!service) return apiError("NOT_FOUND", "Service not found", 404);

    const newStart = new Date(input.startAt);
    const newEnd = new Date(newStart.getTime() + service.durationMinutes * 60 * 1000);

    const rulesError = await validateBookingRules({
      tenantId: ctx.tenantId,
      serviceId: booking.serviceId,
      startAt: newStart,
      endAt: newEnd,
      tenantSettings,
      service,
    });
    if (rulesError) return apiError(rulesError.code, rulesError.message, 422);

    const previousStartAt = booking.startAt;
    const previousEndAt = booking.endAt;

    // Atomically: re-check availability (excluding the booking being moved,
    // since its old slot is about to be freed) and apply the update. A
    // SERIALIZABLE transaction stops two concurrent reschedules from both
    // claiming the same freed slot.
    let updated;
    try {
      updated = await prisma.$transaction(
        async (tx) => {
          const stillAvailable = await isSlotAvailable(
            {
              tenantId: ctx.tenantId,
              serviceId: booking.serviceId,
              trainerId: booking.trainerId ?? undefined,
              locationId: booking.locationId ?? undefined,
              startAt: newStart,
              endAt: newEnd,
              excludeBookingId: booking.id,
            },
            tx
          );
          if (!stillAvailable) {
            throw new Error("SLOT_UNAVAILABLE");
          }
          return tx.booking.update({
            where: { id: params.id },
            data: {
              startAt: newStart,
              endAt: newEnd,
              timezone: input.timezone,
              status: booking.status === "PENDING" ? "PENDING" : "CONFIRMED",
            },
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (txErr) {
      const msg = txErr instanceof Error ? txErr.message : "";
      if (
        msg === "SLOT_UNAVAILABLE" ||
        msg.includes("P2034") ||
        msg.includes("could not serialize")
      ) {
        return apiError("SLOT_UNAVAILABLE", "The requested slot is no longer available", 409);
      }
      throw txErr;
    }

    void prisma.domainEvent.create({
      data: {
        tenantId: ctx.tenantId,
        type: "BOOKING_RESCHEDULED",
        aggregateId: updated.id,
        aggregateType: "Booking",
        payload: {
          bookingId: updated.id,
          previousStartAt: previousStartAt.toISOString(),
          previousEndAt: previousEndAt.toISOString(),
          newStartAt: newStart.toISOString(),
          newEndAt: newEnd.toISOString(),
        },
      },
    });

    // Realtime fan-out: the old slot is freed (notify waitlist), the new slot is taken.
    await Promise.all([
      publishEvent(ctx.tenantId, {
        type: "BOOKING_RESCHEDULED",
        bookingId: updated.id,
        serviceId: booking.serviceId,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      }),
      publishEvent(ctx.tenantId, {
        type: "SLOT_UPDATED",
        serviceId: booking.serviceId,
        trainerId: booking.trainerId ?? undefined,
        startAt: previousStartAt.toISOString(),
        endAt: previousEndAt.toISOString(),
        available: true,
      }),
      publishEvent(ctx.tenantId, {
        type: "SLOT_UPDATED",
        serviceId: booking.serviceId,
        trainerId: booking.trainerId ?? undefined,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
        available: false,
      }),
    ]);

    // Notify first person on the waitlist for the freed slot, if any.
    const waiter = await nextWaiter(
      ctx.tenantId,
      booking.serviceId,
      previousStartAt.toISOString(),
      booking.trainerId ?? undefined
    );
    if (waiter) {
      await publishEvent(ctx.tenantId, {
        type: "WAITLIST_NOTIFIED",
        waitlistId: waiter.id,
        serviceId: booking.serviceId,
        startAt: previousStartAt.toISOString(),
        endAt: previousEndAt.toISOString(),
      });
    }

    return apiSuccess(updated);
  } catch (err) {
    return handleError(err);
  }
}
