import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Badge, Card, EmptyState } from "@famm/ui";
import { cn } from "@/lib/cn";
import type { BookingsTab, ClientBooking, MyBookingsData } from "./my-bookings-data";

interface MyBookingsProps {
  data: MyBookingsData;
}

export function MyBookings({ data }: MyBookingsProps) {
  const rows = data.tab === "upcoming" ? data.upcoming : data.past;
  return (
    <div className="flex flex-col gap-stack-md p-inset-md md:p-inset-lg">
      <TabBar tab={data.tab} upcomingCount={data.upcoming.length} pastCount={data.past.length} />
      {rows.length === 0 ? (
        <Card className="p-inset-md">
          {data.tab === "upcoming" ? (
            <EmptyState
              title="No upcoming sessions"
              description="When a trainer books you in — or you accept an invite — your sessions will land here."
              action={
                <Link
                  href="/my"
                  className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Back to home
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No past sessions"
              description="Once you've completed your first session, your history will live here."
            />
          )}
        </Card>
      ) : (
        <ul className="flex flex-col gap-stack-sm">
          {rows.map((b) => (
            <li key={b.id}>
              <BookingRow booking={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabBar({
  tab,
  upcomingCount,
  pastCount,
}: {
  tab: BookingsTab;
  upcomingCount: number;
  pastCount: number;
}) {
  const tabs: Array<{ key: BookingsTab; label: string; count: number }> = [
    { key: "upcoming", label: "Upcoming", count: upcomingCount },
    { key: "past", label: "Past", count: pastCount },
  ];
  return (
    <div
      role="tablist"
      aria-label="Bookings filter"
      className="inline-flex w-full items-center rounded-pill border border-border bg-surface p-1"
    >
      {tabs.map((t) => {
        const active = t.key === tab;
        return (
          <Link
            key={t.key}
            href={t.key === "upcoming" ? "/my/bookings" : "/my/bookings?tab=past"}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-inline-xs rounded-pill px-inset-sm text-sm font-medium",
              "transition-colors duration-fast ease-standard",
              active ? "bg-accent text-onAccent" : "text-text-secondary hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            )}
          >
            <span>{t.label}</span>
            {t.count > 0 ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-inset-xs text-xs font-semibold",
                  active ? "bg-onAccent/20 text-onAccent" : "bg-surface-sunken text-text-secondary"
                )}
              >
                {t.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

function BookingRow({ booking }: { booking: ClientBooking }) {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const day = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  return (
    <Link
      href={`/my/bookings/${booking.id}`}
      className={cn(
        "flex flex-col gap-stack-xs rounded-card border border-border bg-surface p-inset-sm",
        "transition-colors duration-fast ease-standard hover:bg-surface-sunken",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      )}
    >
      <div className="flex items-baseline justify-between gap-inline-sm">
        <span className="text-sm font-medium text-text-primary">{day}</span>
        <span className="text-sm text-text-secondary">
          {formatTime(start)} – {formatTime(end)}
        </span>
      </div>
      <div className="flex items-start justify-between gap-inline-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{booking.serviceName}</p>
          <p className="truncate text-xs text-text-secondary">
            with {booking.trainerName}
            {booking.locationName ? ` · ${booking.locationName}` : ""}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: ClientBooking["status"] }) {
  switch (status) {
    case "CONFIRMED":
      return <Badge variant="success">Confirmed</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "COMPLETED":
      return <Badge variant="secondary">Completed</Badge>;
    case "NO_SHOW":
      return <Badge variant="destructive">Missed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

// Exported so the empty-list "first-run" surface can reuse the same icon visual.
export const BookingsBlankIcon = CalendarPlus;
