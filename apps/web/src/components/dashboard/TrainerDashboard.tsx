import Link from "next/link";
import { CalendarPlus, ArrowRight, Clock } from "lucide-react";
import { Badge, Card, EmptyState, StatCard } from "@famm/ui";
import { cn } from "@/lib/cn";
import type { DashboardData, TodayBooking } from "./trainer-dashboard-data";

interface TrainerDashboardProps {
  data: DashboardData;
}

/**
 * Server-rendered dashboard composition. Receives resolved data so it can
 * render fully on first paint (mobile-first: no spinner before next-up).
 */
export function TrainerDashboard({ data }: TrainerDashboardProps) {
  if (data.state === "empty") {
    return <FirstRunEmpty firstName={data.user.firstName} />;
  }

  return (
    <div className="flex flex-col gap-stack-lg p-inset-md md:p-inset-lg">
      <GreetingStrip firstName={data.user.firstName} now={data.now} />

      <NextUpSection nextUp={data.nextUp} />

      <KpisRow
        bookingsToday={data.kpis.bookingsToday}
        bookingsTomorrow={data.kpis.bookingsTomorrow}
        pendingConfirmations={data.kpis.pendingConfirmations}
        unreadMessages={data.kpis.unreadMessages}
      />

      <TodayAgenda today={data.today} />

      <Shortcuts />
    </div>
  );
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function GreetingStrip({ firstName, now }: { firstName: string; now: string }) {
  const date = new Date(now);
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
  return (
    <header className="flex flex-col gap-stack-xs">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{formattedDate}</p>
      <h1 className="text-2xl font-semibold text-text-primary">
        {greeting(date)}, {firstName}.
      </h1>
    </header>
  );
}

function NextUpSection({ nextUp }: { nextUp: DashboardData["nextUp"] }) {
  return (
    <section aria-labelledby="next-up-heading" className="flex flex-col gap-stack-sm">
      <header className="flex items-baseline justify-between">
        <h2 id="next-up-heading" className="text-lg font-semibold text-text-primary">
          Next up
        </h2>
        <Link
          href="/calendar"
          className="text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:underline"
        >
          Full calendar
        </Link>
      </header>
      {nextUp ? <NextUpCard nextUp={nextUp} /> : <NoUpcomingCard />}
    </section>
  );
}

function NextUpCard({ nextUp }: { nextUp: NonNullable<DashboardData["nextUp"]> }) {
  const start = new Date(nextUp.startAt);
  const end = new Date(nextUp.endAt);
  const time = `${formatTime(start)} – ${formatTime(end)}`;
  const minutesAway = Math.round((start.getTime() - Date.now()) / 60_000);
  const isSoon = minutesAway > 0 && minutesAway <= 30;
  const isStartingNow = minutesAway <= 0 && end.getTime() > Date.now();

  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <div className="flex items-start justify-between gap-inline-sm">
        <div className="flex flex-col gap-stack-xs">
          <p className="text-sm font-medium text-text-secondary">{time}</p>
          <p className="text-lg font-semibold text-text-primary">{nextUp.clientName}</p>
          <p className="text-sm text-text-secondary">
            {nextUp.serviceName}
            {nextUp.locationName ? ` · ${nextUp.locationName}` : ""}
          </p>
        </div>
        <StatusBadge status={nextUp.status} />
      </div>
      <div className="flex items-center gap-inline-sm">
        {isStartingNow ? (
          <Link
            href={`/session/${nextUp.id}`}
            className="inline-flex h-10 items-center justify-center rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Start session
          </Link>
        ) : (
          <Link
            href={`/bookings/${nextUp.id}`}
            className="inline-flex h-10 items-center justify-center rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            View booking
            <ArrowRight aria-hidden className="ml-inline-xs h-4 w-4" />
          </Link>
        )}
        {isSoon ? (
          <Badge variant="warning">
            <Clock aria-hidden className="mr-inline-xs h-3 w-3" />
            In {minutesAway} min
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}

function NoUpcomingCard() {
  return (
    <Card className="p-inset-md">
      <EmptyState
        title="No upcoming sessions"
        description="When clients book you, the next one will show up here."
        action={
          <Link
            href="/calendar/new"
            className="inline-flex h-10 items-center justify-center rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <CalendarPlus aria-hidden className="mr-inline-xs h-4 w-4" />
            Add a booking
          </Link>
        }
      />
    </Card>
  );
}

function KpisRow({
  bookingsToday,
  bookingsTomorrow,
  pendingConfirmations,
  unreadMessages,
}: DashboardData["kpis"]) {
  return (
    <section aria-labelledby="kpis-heading" className="flex flex-col gap-stack-sm">
      <h2 id="kpis-heading" className="sr-only">
        Key numbers
      </h2>
      <div className="grid grid-cols-2 gap-stack-sm md:grid-cols-4">
        <StatCard
          label="Today"
          value={String(bookingsToday)}
          caption={bookingsToday === 1 ? "booking" : "bookings"}
        />
        <StatCard
          label="Tomorrow"
          value={String(bookingsTomorrow)}
          caption={bookingsTomorrow === 1 ? "booking" : "bookings"}
        />
        <StatCard
          label="Pending"
          value={String(pendingConfirmations)}
          caption="awaiting confirmation"
          tone={pendingConfirmations > 0 ? "warning" : "default"}
        />
        <StatCard label="Messages" value={String(unreadMessages)} caption="unread" />
      </div>
    </section>
  );
}

function TodayAgenda({ today }: { today: DashboardData["today"] }) {
  return (
    <section aria-labelledby="today-heading" className="flex flex-col gap-stack-sm">
      <header className="flex items-baseline justify-between">
        <h2 id="today-heading" className="text-lg font-semibold text-text-primary">
          Today
        </h2>
        <Link
          href="/calendar"
          className="text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:underline"
        >
          See all
        </Link>
      </header>
      {today.length === 0 ? (
        <Card className="p-inset-md">
          <EmptyState
            title="Nothing on the books today"
            description="Enjoy the break — or open a slot for last-minute bookings."
            action={
              <Link
                href="/calendar/availability"
                className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Manage availability
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-stack-xs">
          {today.map((booking) => (
            <li key={booking.id}>
              <TodayRow booking={booking} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TodayRow({ booking }: { booking: TodayBooking }) {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className={cn(
        "flex items-center gap-inline-sm rounded-card border border-border bg-surface p-inset-sm",
        "transition-colors duration-fast ease-standard hover:bg-surface-sunken",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      )}
    >
      <div className="flex w-16 flex-col text-sm font-medium text-text-primary">
        <span>{formatTime(start)}</span>
        <span className="text-xs font-normal text-text-secondary">{formatTime(end)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{booking.clientName}</p>
        <p className="truncate text-xs text-text-secondary">{booking.serviceName}</p>
      </div>
      <StatusBadge status={booking.status} />
    </Link>
  );
}

function StatusBadge({ status }: { status: TodayBooking["status"] }) {
  switch (status) {
    case "CONFIRMED":
      return <Badge variant="success">Confirmed</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "COMPLETED":
      return <Badge variant="secondary">Done</Badge>;
    case "NO_SHOW":
      return <Badge variant="destructive">No-show</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function Shortcuts() {
  const shortcuts: ReadonlyArray<{ href: string; label: string }> = [
    { href: "/calendar/new", label: "New booking" },
    { href: "/clients/new", label: "New client" },
    { href: "/catalog/services/new", label: "New service" },
    { href: "/calendar/availability", label: "Availability" },
  ];
  return (
    <section aria-labelledby="shortcuts-heading" className="flex flex-col gap-stack-sm">
      <h2 id="shortcuts-heading" className="text-lg font-semibold text-text-primary">
        Shortcuts
      </h2>
      <div className="flex flex-wrap gap-inline-sm">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-pill",
              "border border-border bg-surface px-inset-md",
              "text-sm font-medium text-text-primary",
              "transition-colors duration-fast ease-standard hover:bg-surface-sunken",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function FirstRunEmpty({ firstName }: { firstName: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-inset-lg">
      <EmptyState
        title={`Welcome, ${firstName}.`}
        description="Add your first service so clients can start booking. We'll guide you the rest of the way."
        action={
          <Link
            href="/onboarding/services"
            className="inline-flex h-10 items-center justify-center rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Finish setup
          </Link>
        }
        secondaryAction={
          <Link
            href="/calendar/new"
            className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Add a booking
          </Link>
        }
      />
    </div>
  );
}

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
