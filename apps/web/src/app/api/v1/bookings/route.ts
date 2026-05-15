import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestContext } from "@/lib/request-context";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { CreateBookingSchema } from "@famm/shared";
import { validateBookingRules } from "@/lib/booking/rules";
import { isSlotAvailable } from "@/lib/booking/availability";

export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const skip = (page - 1) * limit;

    const clientFilter =
      ctx.userRole === "CLIENT" ? { clientId: ctx.userId } : {};

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
    const ctx = getRequestContext();
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
    const endAt = new Date(
      startAt.getTime() + service.durationMinutes * 60 * 1000
    );

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

    const available = await isSlotAvailable({
      tenantId: ctx.tenantId,
      serviceId: input.serviceId,
      trainerId: input.trainerId,
      locationId: input.locationId,
      startAt,
      endAt,
    });

    if (!available) {
      return apiError(
        "SLOT_UNAVAILABLE",
        "The requested slot is no longer available",
        409
      );
    }

    const booking = await prisma.booking.create({
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

    return apiSuccess(booking, 201);
  } catch (err) {
    return handleError(err);
  }
}
