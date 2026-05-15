import { prisma } from "@/lib/db";

interface AvailabilityCheckParams {
  tenantId: string;
  serviceId: string;
  trainerId?: string;
  locationId?: string;
  startAt: Date;
  endAt: Date;
}

export async function isSlotAvailable({
  tenantId,
  serviceId,
  trainerId,
  locationId,
  startAt,
  endAt,
}: AvailabilityCheckParams): Promise<boolean> {
  const overlapping = await prisma.booking.count({
    where: {
      tenantId,
      serviceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      ...(trainerId ? { trainerId } : {}),
      ...(locationId ? { locationId } : {}),
    },
  });

  if (overlapping > 0) return false;

  if (trainerId) {
    const trainerBlocked = await prisma.blockedPeriod.count({
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
    const locationBlocked = await prisma.blockedPeriod.count({
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
