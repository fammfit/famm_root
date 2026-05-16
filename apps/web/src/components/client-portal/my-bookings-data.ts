import { prisma } from "@/lib/db";
import { getRequestContext } from "@/lib/request-context";

export type BookingsTab = "upcoming" | "past";

export interface ClientBooking {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  trainerName: string;
  locationName: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED";
}

export interface MyBookingsData {
  tab: BookingsTab;
  upcoming: ReadonlyArray<ClientBooking>;
  past: ReadonlyArray<ClientBooking>;
}

const MAX_ROWS = 50;

export async function getMyBookingsData(tab: BookingsTab = "upcoming"): Promise<MyBookingsData> {
  const ctx = getRequestContext();
  const now = new Date();

  // Always fetch both lists — the page renders tab counts and we want one
  // round-trip on Sunday-morning openings. Cap each list at MAX_ROWS so the
  // payload stays mobile-friendly; pagination ships with the table refactor.
  const [upcomingRaw, pastRaw] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId: ctx.tenantId,
        clientId: ctx.userId,
        startAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { startAt: "asc" },
      take: MAX_ROWS,
      select: bookingSelect,
    }),
    prisma.booking.findMany({
      where: {
        tenantId: ctx.tenantId,
        clientId: ctx.userId,
        OR: [{ startAt: { lt: now } }, { status: { in: ["CANCELLED", "COMPLETED", "NO_SHOW"] } }],
      },
      orderBy: { startAt: "desc" },
      take: MAX_ROWS,
      select: bookingSelect,
    }),
  ]);

  return {
    tab,
    upcoming: upcomingRaw.map(toClientBooking),
    past: pastRaw.map(toClientBooking),
  };
}

const bookingSelect = {
  id: true,
  startAt: true,
  endAt: true,
  status: true,
  paymentStatus: true,
  service: { select: { name: true } },
  location: { select: { name: true } },
  trainer: {
    select: {
      user: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

type BookingRow = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  paymentStatus: string;
  service: { name: string } | null;
  location: { name: string } | null;
  trainer: { user: { firstName: string; lastName: string } } | null;
};

function toClientBooking(b: BookingRow): ClientBooking {
  return {
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    serviceName: b.service?.name ?? "Session",
    trainerName: b.trainer?.user
      ? `${b.trainer.user.firstName} ${b.trainer.user.lastName}`.trim()
      : "Your trainer",
    locationName: b.location?.name ?? null,
    status: b.status as ClientBooking["status"],
    paymentStatus: b.paymentStatus as ClientBooking["paymentStatus"],
  };
}
