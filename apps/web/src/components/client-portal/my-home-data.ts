import { prisma } from "@/lib/db";
import { getRequestContext } from "@/lib/request-context";

export type MyHomeState = "ready" | "first-run";

export interface UpcomingBooking {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  trainerName: string;
  locationName: string | null;
  status: "PENDING" | "CONFIRMED";
}

export interface MyHomeData {
  state: MyHomeState;
  user: { firstName: string };
  now: string;
  next: UpcomingBooking | null;
  upcomingCount: number;
  /** Bookings completed in the last 90 days — used for the "your activity" rail. */
  recentCompletedCount: number;
  /**
   * The trainers the client has worked with (de-duped). Anchor for the
   * "Book again" affordance until we ship a public trainer directory.
   */
  pastTrainers: ReadonlyArray<{ slug: string | null; name: string }>;
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
 * Server-side data resolver for the client portal home (`/my`).
 *
 * `first-run` fires when the client has zero bookings on record (they
 * arrived via /invite or registered directly without booking yet).
 */
export async function getMyHomeData(): Promise<MyHomeData> {
  const ctx = getRequestContext();
  const now = new Date();
  const ninetyDaysAgo = addDays(startOfDay(now), -90);

  const [user, nextRaw, upcomingCount, recentCompletedCount, pastTrainerRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true },
    }),
    prisma.booking.findFirst({
      where: {
        tenantId: ctx.tenantId,
        clientId: ctx.userId,
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
        location: { select: { name: true } },
        trainer: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.booking.count({
      where: {
        tenantId: ctx.tenantId,
        clientId: ctx.userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: now },
      },
    }),
    prisma.booking.count({
      where: {
        tenantId: ctx.tenantId,
        clientId: ctx.userId,
        status: "COMPLETED",
        startAt: { gte: ninetyDaysAgo, lt: now },
      },
    }),
    prisma.booking.findMany({
      where: {
        tenantId: ctx.tenantId,
        clientId: ctx.userId,
        trainer: { isNot: null },
      },
      distinct: ["trainerId"],
      orderBy: { startAt: "desc" },
      take: 5,
      select: {
        trainer: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  const totalKnownBookings = upcomingCount + recentCompletedCount + (nextRaw ? 1 : 0);

  return {
    state: totalKnownBookings === 0 ? "first-run" : "ready",
    user: { firstName: user?.firstName ?? "there" },
    now: now.toISOString(),
    next: nextRaw
      ? {
          id: nextRaw.id,
          startAt: nextRaw.startAt.toISOString(),
          endAt: nextRaw.endAt.toISOString(),
          serviceName: nextRaw.service?.name ?? "Session",
          trainerName: nextRaw.trainer?.user
            ? `${nextRaw.trainer.user.firstName} ${nextRaw.trainer.user.lastName}`.trim()
            : "Your trainer",
          locationName: nextRaw.location?.name ?? null,
          status: nextRaw.status as "PENDING" | "CONFIRMED",
        }
      : null,
    upcomingCount,
    recentCompletedCount,
    pastTrainers: pastTrainerRaw
      .map((b): { slug: string | null; name: string } | null =>
        b.trainer?.user
          ? {
              // Public trainer slugs land with the public booking flow.
              slug: null,
              name: `${b.trainer.user.firstName} ${b.trainer.user.lastName}`.trim(),
            }
          : null
      )
      .filter((t): t is { slug: string | null; name: string } => t !== null),
  };
}
