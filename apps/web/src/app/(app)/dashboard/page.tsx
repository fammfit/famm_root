import Link from "next/link";
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  StatCard,
} from "@famm/ui";
import {
  getDashboardData,
  type DashboardData,
} from "../../../components/dashboard/dashboard-data";

export const metadata = {
  title: "Today — FAMM",
  description: "Your day at a glance.",
};

// Canonical FAMM dashboard. Implements the layout in
// docs/design-system/patterns/dashboard.md:
//   greeting → next-up → stats row → activity feed → shortcuts.
// Server Component: data is resolved on the server so the next-up
// card renders on first paint without a spinner.
export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main
      id="dashboard-main"
      className="mx-auto flex w-full max-w-6xl flex-col gap-stack-lg p-inset-md md:p-inset-lg"
    >
      <GreetingStrip date={data.date} firstName={data.user.firstName} />

      {data.state === "loading" && <DashboardSkeleton />}
      {data.state === "error" && <DashboardError />}
      {data.state === "empty" && <DashboardEmpty />}

      {data.state === "ready" && (
        <>
          <section
            aria-labelledby="next-up-heading"
            aria-live="polite"
            className="grid grid-cols-1 gap-stack-md md:grid-cols-3"
          >
            <h2 id="next-up-heading" className="sr-only">
              Next up
            </h2>
            <NextUpCard nextUp={data.nextUp} />
            <StatsRow stats={data.stats} />
          </section>

          <section
            aria-labelledby="activity-heading"
            className="flex flex-col gap-stack-sm"
          >
            <header className="flex items-baseline justify-between">
              <h2
                id="activity-heading"
                className="text-lg font-semibold text-text-primary"
              >
                Recent activity
              </h2>
              <Link
                href="/history"
                className="text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:underline"
              >
                See all
              </Link>
            </header>
            <ActivityFeed activity={data.activity} />
          </section>

          <section
            aria-labelledby="shortcuts-heading"
            className="flex flex-col gap-stack-sm"
          >
            <h2
              id="shortcuts-heading"
              className="text-lg font-semibold text-text-primary"
            >
              Shortcuts
            </h2>
            <div className="flex flex-wrap gap-inline-sm">
              <Link
                href="/log"
                className={buttonVariants({ variant: "secondary" })}
              >
                Log a set
              </Link>
              <Link
                href="/messages"
                className={buttonVariants({ variant: "ghost" })}
              >
                Message trainer
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function GreetingStrip({
  date,
  firstName,
}: {
  date: Date;
  firstName: string;
}) {
  // Locale-aware date string; server renders so first paint is correct.
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
  return (
    <header className="flex flex-col gap-stack-xs">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
        Today, {firstName}
      </h1>
      <p className="text-sm text-text-muted">{dateLabel}</p>
    </header>
  );
}

function NextUpCard({ nextUp }: { nextUp: DashboardData["nextUp"] }) {
  if (!nextUp) {
    // Empty state — first-use, follows empty-states.md.
    return (
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>No plan yet</CardTitle>
          <CardDescription>
            Build your first plan to see what&apos;s next.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/plan/new"
            className={buttonVariants({ variant: "default" })}
          >
            Create first plan
          </Link>
        </CardFooter>
      </Card>
    );
  }
  return (
    <Card variant="interactive" className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-inline-sm">
          <CardTitle>{nextUp.title}</CardTitle>
          <Badge variant="secondary">Today</Badge>
        </div>
        <CardDescription>{nextUp.summary}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Link
          href={nextUp.href}
          className={buttonVariants({ variant: "default" })}
        >
          Start workout
        </Link>
      </CardFooter>
    </Card>
  );
}

function StatsRow({ stats }: { stats: DashboardData["stats"] }) {
  return (
    <div
      role="group"
      aria-label="Week summary"
      className="grid grid-cols-2 gap-stack-sm md:col-span-1 md:grid-cols-1"
    >
      {stats.map((s) => (
        <StatCard
          key={s.key}
          label={s.label}
          value={s.value}
          unit={s.unit}
          caption={s.caption}
          tone={s.tone ?? "default"}
        />
      ))}
    </div>
  );
}

function ActivityFeed({ activity }: { activity: DashboardData["activity"] }) {
  if (activity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No recent activity</CardTitle>
          <CardDescription>
            Your last five workouts will show up here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card>
      <ul className="divide-y divide-border-subtle">
        {activity.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between p-inset-md"
          >
            <div className="flex items-center gap-inline-sm">
              <span className="text-sm font-medium text-text-primary">
                {event.title}
              </span>
              {event.tone === "pr" && <Badge variant="pr">PR</Badge>}
              {event.tone === "success" && (
                <Badge variant="success">Done</Badge>
              )}
            </div>
            <span className="text-xs text-text-muted">{event.when}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Loading skeleton — preserves the page shape so layout doesn't jump
// when data arrives. Per loading-states.md §3.
function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
      className="grid grid-cols-1 gap-stack-md md:grid-cols-3"
    >
      <Card className="md:col-span-2">
        <div className="h-40 animate-pulse bg-surface-sunken/40" />
      </Card>
      <div className="grid grid-cols-2 gap-stack-sm md:grid-cols-1">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="h-24 animate-pulse bg-surface-sunken/40" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// Per error-states.md: specific title, retry path, no stack trace.
function DashboardError() {
  return (
    <Card role="alert" aria-labelledby="dashboard-error-title">
      <CardHeader>
        <CardTitle id="dashboard-error-title">
          Couldn&apos;t load your dashboard.
        </CardTitle>
        <CardDescription>
          Something went wrong on our end. Your data is safe.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "default" })}
        >
          Retry
        </Link>
      </CardFooter>
    </Card>
  );
}

// Per empty-states.md: explain absence + offer the next step.
function DashboardEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No data yet</CardTitle>
        <CardDescription>
          Log your first set to see your dashboard come alive.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Link href="/log" className={buttonVariants({ variant: "default" })}>
          Log first set
        </Link>
      </CardFooter>
    </Card>
  );
}
