import { prisma } from "@/lib/db";
import type { TimeSlot } from "@famm/shared";

interface GenerateSlotsParams {
  tenantId: string;
  serviceId: string;
  trainerId?: string;
  locationId?: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export async function generateAvailableSlots({
  tenantId,
  serviceId,
  trainerId,
  locationId,
  startDate,
  endDate,
}: GenerateSlotsParams): Promise<TimeSlot[]> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId, isActive: true },
  });

  if (!service) return [];

  const rules = await prisma.availabilityRule.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(trainerId ? { trainerId } : {}),
      ...(locationId ? { locationId } : serviceId ? { serviceId } : {}),
    },
  });

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);
  const slotDurationMs = service.durationMinutes * 60 * 1000;
  const bufferMs =
    (service.bufferAfterMinutes + service.bufferBeforeMinutes) * 60 * 1000;

  const [existingBookings, blockedPeriods] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        serviceId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: start },
        endAt: { lte: end },
        ...(trainerId ? { trainerId } : {}),
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.blockedPeriod.findMany({
      where: {
        tenantId,
        startAt: { lt: end },
        endAt: { gt: start },
        OR: [
          ...(trainerId ? [{ trainerId }] : []),
          ...(locationId ? [{ locationId }] : []),
          { trainerId: null, locationId: null },
        ],
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const slots: TimeSlot[] = [];
  const now = new Date();
  const cursor = new Date(start);

  while (cursor <= end) {
    const dayName = DAY_NAMES[cursor.getDay()];
    if (!dayName) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    const dayRules = rules.filter((r) => r.dayOfWeek === dayName);

    for (const rule of dayRules) {
      const [startHour = 0, startMin = 0] = rule.startTime
        .split(":")
        .map(Number);
      const [endHour = 0, endMin = 0] = rule.endTime.split(":").map(Number);

      const windowStart = new Date(cursor);
      windowStart.setUTCHours(startHour, startMin, 0, 0);

      const windowEnd = new Date(cursor);
      windowEnd.setUTCHours(endHour, endMin, 0, 0);

      let slotStart = new Date(windowStart);

      while (slotStart.getTime() + slotDurationMs <= windowEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

        if (slotStart <= now) {
          slotStart = new Date(slotStart.getTime() + slotDurationMs + bufferMs);
          continue;
        }

        const hasConflict =
          existingBookings.some(
            (b) => slotStart < b.endAt && slotEnd > b.startAt
          ) ||
          blockedPeriods.some(
            (b) => slotStart < b.endAt && slotEnd > b.startAt
          );

        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          available: !hasConflict,
          price: service.basePrice,
          trainerId,
        });

        slotStart = new Date(slotStart.getTime() + slotDurationMs + bufferMs);
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
