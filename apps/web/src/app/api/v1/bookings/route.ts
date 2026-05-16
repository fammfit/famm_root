import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestContext, getRequestContextChecked } from "@/lib/request-context";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { CreateBookingSchema } from "@famm/shared";
import { validateBookingRules } from "@/lib/booking/rules";
import { isSlotAvailable } from "@/lib/booking/availability";
import { publishEvent } from "@/lib/booking/realtime";

export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const skip = (page - 1) * limit;

    const clientFilter = ctx.userRole === "CLIENT" ? { clientId: ctx.userId } : {};

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where: { tenantId: ctx.tenantId, ...clientFilter },
        include: {
          service: {
            select: { id: true, name: true, durationMinutes: true },
          },
          trainer: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          location: { select: { id: true, name: true } },
        },
        orderBy: { startAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({
        where: { tenantId: ctx.tenantId, ...clientFilter },
      }),
    ]);

    return apiSuccess({
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequestContextChecked();
    const body = (await request.json()) as unknown;
    const input = CreateBookingSchema.parse(body);

    const [service, tenantSettings] = await Promise.all([
      prisma.service.findFirst({
        where: { id: input.serviceId, tenantId: ctx.tenantId, isActive: true },
      }),
      prisma.tenantSettings.findUnique({ where: { tenantId: ctx.tenantId } }),
    ]);

    if (!service) {
      return apiError("NOT_FOUND", "Service not found", 404);
    }

    const startAt = new Date(input.startAt);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);

    const rulesError = await validateBookingRules({
      tenantId: ctx.tenantId,
      serviceId: input.serviceId,
      startAt,
      endAt,
      tenantSettings,
      service,
    });

    if (rulesError) {
      return apiError(rulesError.code, rulesError.message, 422);
    }

    // Atomically check availability and create the booking. Two concurrent
    // requests for the same slot would otherwise both pass `isSlotAvailable`
    // and both insert. We wrap the check + insert in a SERIALIZABLE
    // transaction so the database refuses concurrent conflicting writes.
    let booking;
    try {
      booking = await prisma.$transaction(
        async (tx) => {
          const stillAvailable = await isSlotAvailable(
            {
              tenantId: ctx.tenantId,
              serviceId: input.serviceId,
              trainerId: input.trainerId,
              locationId: input.locationId,
              startAt,
              endAt,
            },
            tx
          );

          if (!stillAvailable) {
            throw new Error("SLOT_UNAVAILABLE");
          }

          return tx.booking.create({
            data: {
              tenantId: ctx.tenantId,
              clientId: ctx.userId,
              serviceId: input.serviceId,
              trainerId: input.trainerId,
              locationId: input.locationId,
              startAt,
              endAt,
              timezone: input.timezone,
              status: "PENDING",
              price: service.basePrice,
              currency: service.currency,
              notes: input.notes,
              paymentStatus: "UNPAID",
            },
            include: {
              service: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (txErr) {
      const msg = txErr instanceof Error ? txErr.message : "";
      if (msg === "SLOT_UNAVAILABLE") {
        return apiError("SLOT_UNAVAILABLE", "The requested slot is no longer available", 409);
      }
      // Serializable conflicts surface as Prisma error P2034; treat the same.
      if (msg.includes("P2034") || msg.includes("could not serialize")) {
        return apiError("SLOT_UNAVAILABLE", "The requested slot is no longer available", 409);
      }
      throw txErr;
    }

    void prisma.domainEvent.create({
      data: {
        tenantId: ctx.tenantId,
        type: "BOOKING_CREATED",
        aggregateId: booking.id,
        aggregateType: "Booking",
        payload: {
          bookingId: booking.id,
          clientId: ctx.userId,
          serviceId: input.serviceId,
        },
      },
    });

    await Promise.all([
      publishEvent(ctx.tenantId, {
        type: "BOOKING_CREATED",
        bookingId: booking.id,
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
        available: false,
      }),
    ]);

    return apiSuccess(booking, 201);
  } catch (err) {
    return handleError(err);
  }
}
