import { prisma } from "@/lib/db";
import { getRequestContext } from "@/lib/request-context";

export type DashboardState = "ready" | "empty" | "error";

export interface NextUpBooking {
  id: string;
  startAt: string;
  endAt: string;
  clientName: string;
  serviceName: string;
  locationName: string | null;
  status: "PENDING" | "CONFIRMED";
}

export interface DashboardKpis {
  bookingsToday: number;
  bookingsTomorrow: number;
  pendingConfirmations: number;
  unreadMessages: number;
}

export interface TodayBooking {
  id: string;
  startAt: string;
  endAt: string;
  clientName: string;
  serviceName: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
}

export interface DashboardData {
  state: DashboardState;
  user: { firstName: string };
  now: string;
  nextUp: NextUpBooking | null;
  kpis: DashboardKpis;
  today: ReadonlyArray<TodayBooking>;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Server-side data resolver for the trainer dashboard.
 *
 * Scope:
 *   - "Mine" for individual TRAINERs (trainerId = userId).
 *   - All-tenant for TENANT_OWNER / TENANT_ADMIN / TRAINER_LEAD.
 *   STAFF inherits the lead view as a safe default; tighten later if needed.
 *
 * Returns `state: "empty"` only when the trainer has zero bookings *and* zero
 * services — i.e. the account is fresh. Any non-empty schedule renders as
 * "ready" so the activity rail can hold its own empty state per section.
 */
export async function getTrainerDashboardData(): Promise<DashboardData> {
  const ctx = getRequestContext();
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterTomorrow = addDays(todayStart, 2);

  // Scope: individual trainer sees their own bookings; everyone else sees
  // the whole tenant. Trainer-scoped queries filter via the related
  // TrainerProfile (Booking.trainerId is a TrainerProfile.id, not a userId).
  const scopeFilter =
    ctx.userRole === "TRAINER"
      ? {
          tenantId: ctx.tenantId,
          trainer: { userId: ctx.userId },
        }
      : { tenantId: ctx.tenantId };

  const [user, nextUpRaw, todayRaw, countsRaw, serviceCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true },
    }),
    prisma.booking.findFirst({
      where: {
        ...scopeFilter,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: now },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        service: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
        location: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: {
        ...scopeFilter,
        startAt: { gte: todayStart, lt: tomorrowStart },
      },
      orderBy: { startAt: "asc" },
      take: 25,
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        service: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: {
        ...scopeFilter,
        startAt: { gte: todayStart, lt: dayAfterTomorrow },
      },
      _count: { _all: true },
    }),
    prisma.service.count({
      where: { tenantId: ctx.tenantId, isActive: true },
    }),
  ]);

  let bookingsToday = 0;
  let bookingsTomorrow = 0;
  let pendingConfirmations = 0;
  for (const row of countsRaw) {
    const total = row._count._all;
    if (row.status === "PENDING") pendingConfirmations += total;
  }

  const tomorrowBookings = await prisma.booking.count({
    where: {
      ...scopeFilter,
      startAt: { gte: tomorrowStart, lt: dayAfterTomorrow },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
  bookingsTomorrow = tomorrowBookings;
  bookingsToday = todayRaw.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED").length;

  const isEmpty = !nextUpRaw && todayRaw.length === 0 && serviceCount === 0;

  return {
    state: isEmpty ? "empty" : "ready",
    user: { firstName: user?.firstName ?? "there" },
    now: now.toISOString(),
    nextUp: nextUpRaw
      ? {
          id: nextUpRaw.id,
          startAt: nextUpRaw.startAt.toISOString(),
          endAt: nextUpRaw.endAt.toISOString(),
          clientName: `${nextUpRaw.client.firstName} ${nextUpRaw.client.lastName}`.trim(),
          serviceName: nextUpRaw.service?.name ?? "Session",
          locationName: nextUpRaw.location?.name ?? null,
          status: nextUpRaw.status as "PENDING" | "CONFIRMED",
        }
      : null,
    kpis: {
      bookingsToday,
      bookingsTomorrow,
      pendingConfirmations,
      // Messaging model not implemented yet — placeholder until /messaging lands.
      unreadMessages: 0,
    },
    today: todayRaw.map((b) => ({
      id: b.id,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      clientName: `${b.client.firstName} ${b.client.lastName}`.trim(),
      serviceName: b.service?.name ?? "Session",
      status: b.status as TodayBooking["status"],
    })),
  };
}
