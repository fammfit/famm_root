import Link from "next/link";
import { CalendarPlus, ArrowRight, Clock, Sparkles } from "lucide-react";
import { Badge, Card, EmptyState, StatCard } from "@famm/ui";
import type { MyHomeData, UpcomingBooking } from "./my-home-data";

interface MyHomeProps {
  data: MyHomeData;
}

export function MyHome({ data }: MyHomeProps) {
  if (data.state === "first-run") {
    return <FirstRunWelcome firstName={data.user.firstName} />;
  }

  return (
    <div className="flex flex-col gap-stack-lg p-inset-md md:p-inset-lg">
      <Greeting firstName={data.user.firstName} now={data.now} />

      <NextSection next={data.next} />

      <ActivitySection
        upcomingCount={data.upcomingCount}
        recentCompletedCount={data.recentCompletedCount}
      />

      {data.pastTrainers.length > 0 ? <BookAgainSection trainers={data.pastTrainers} /> : null}
    </div>
  );
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Greeting({ firstName, now }: { firstName: string; now: string }) {
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

function NextSection({ next }: { next: UpcomingBooking | null }) {
  return (
    <section aria-labelledby="next-up-heading" className="flex flex-col gap-stack-sm">
      <header className="flex items-baseline justify-between">
        <h2 id="next-up-heading" className="text-lg font-semibold text-text-primary">
          Next up
        </h2>
        <Link
          href="/my/bookings"
          className="text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:underline"
        >
          All bookings
        </Link>
      </header>
      {next ? <NextCard next={next} /> : <NoUpcomingCard />}
    </section>
  );
}

function NextCard({ next }: { next: UpcomingBooking }) {
  const start = new Date(next.startAt);
  const end = new Date(next.endAt);
  const time = `${formatTime(start)} – ${formatTime(end)}`;
  const day = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const minutesAway = Math.round((start.getTime() - Date.now()) / 60_000);
  const isSoon = minutesAway > 0 && minutesAway <= 60;

  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <div className="flex items-start justify-between gap-inline-sm">
        <div className="flex flex-col gap-stack-xs">
          <p className="text-sm font-medium text-text-secondary">
            {day} · {time}
          </p>
          <p className="text-lg font-semibold text-text-primary">{next.serviceName}</p>
          <p className="text-sm text-text-secondary">
            with {next.trainerName}
            {next.locationName ? ` · ${next.locationName}` : ""}
          </p>
        </div>
        <StatusBadge status={next.status} />
      </div>
      <div className="flex flex-wrap items-center gap-inline-sm">
        <Link
          href={`/my/bookings/${next.id}`}
          className="inline-flex h-10 items-center justify-center rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          View booking
          <ArrowRight aria-hidden className="ml-inline-xs h-4 w-4" />
        </Link>
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
        title="Nothing booked yet"
        description="Your next session will show up here as soon as it's on the books."
        action={
          <Link
            href="/my/bookings"
            className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            See past sessions
          </Link>
        }
      />
    </Card>
  );
}

function ActivitySection({
  upcomingCount,
  recentCompletedCount,
}: {
  upcomingCount: number;
  recentCompletedCount: number;
}) {
  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-stack-sm">
      <h2 id="activity-heading" className="sr-only">
        Your activity
      </h2>
      <div className="grid grid-cols-2 gap-stack-sm">
        <StatCard
          label="Upcoming"
          value={String(upcomingCount)}
          caption={upcomingCount === 1 ? "session" : "sessions"}
        />
        <StatCard
          label="Last 90 days"
          value={String(recentCompletedCount)}
          caption="completed"
          tone={recentCompletedCount > 0 ? "success" : "default"}
        />
      </div>
    </section>
  );
}

function BookAgainSection({
  trainers,
}: {
  trainers: ReadonlyArray<{ slug: string | null; name: string }>;
}) {
  return (
    <section aria-labelledby="book-again-heading" className="flex flex-col gap-stack-sm">
      <h2 id="book-again-heading" className="text-lg font-semibold text-text-primary">
        Book again
      </h2>
      <ul className="flex flex-col gap-stack-xs">
        {trainers.map((t) => (
          <li key={t.name}>
            <div className="flex items-center justify-between gap-inline-sm rounded-card border border-border bg-surface p-inset-sm">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-text-primary">{t.name}</span>
                <span className="text-xs text-text-secondary">
                  You&rsquo;ve trained together before
                </span>
              </div>
              <Link
                href="/my/bookings"
                className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface px-inset-sm text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Book
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FirstRunWelcome({ firstName }: { firstName: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-inset-lg">
      <EmptyState
        icon={<Sparkles aria-hidden className="h-6 w-6" />}
        title={`Welcome, ${firstName}.`}
        description="You're all set. When a trainer books you in — or you accept an invite — your sessions will land here."
        action={
          <Link
            href="/my/bookings"
            className="inline-flex h-10 items-center justify-center rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <CalendarPlus aria-hidden className="mr-inline-xs h-4 w-4" />
            See bookings
          </Link>
        }
      />
    </div>
  );
}

function StatusBadge({ status }: { status: UpcomingBooking["status"] }) {
  switch (status) {
    case "CONFIRMED":
      return <Badge variant="success">Confirmed</Badge>;
    case "PENDING":
      return <Badge variant="warning">Awaiting confirmation</Badge>;
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
