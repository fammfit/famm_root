import { prisma } from "@/lib/db";
import type { Prisma } from "@famm/db";

interface AvailabilityCheckParams {
  tenantId: string;
  serviceId: string;
  trainerId?: string;
  locationId?: string;
  startAt: Date;
  endAt: Date;
  /** Ignore this booking id when checking for overlap (used during reschedule). */
  excludeBookingId?: string;
}

type PrismaLike = Prisma.TransactionClient | typeof prisma;

export async function isSlotAvailable(
  {
    tenantId,
    serviceId,
    trainerId,
    locationId,
    startAt,
    endAt,
    excludeBookingId,
  }: AvailabilityCheckParams,
  client: PrismaLike = prisma
): Promise<boolean> {
  const overlapping = await client.booking.count({
    where: {
      tenantId,
      serviceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      ...(trainerId ? { trainerId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
    },
  });

  if (overlapping > 0) return false;

  if (trainerId) {
    const trainerBlocked = await client.blockedPeriod.count({
      where: {
        tenantId,
        trainerId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (trainerBlocked > 0) return false;
  }

  if (locationId) {
    const locationBlocked = await client.blockedPeriod.count({
      where: {
        tenantId,
        locationId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (locationBlocked > 0) return false;
  }

  return true;
}
