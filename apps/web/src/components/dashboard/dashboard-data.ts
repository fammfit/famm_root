// Server-side data resolver for the dashboard route.
// Real wiring (auth + DB) follows when the app shell adopts the (app)
// route group. For now this returns illustrative mock data so the
// layout can be reviewed end-to-end against
// docs/design-system/patterns/dashboard.md.

export type DashboardState = "loading" | "ready" | "empty" | "error";

export interface DashboardData {
  state: DashboardState;
  user: { firstName: string };
  date: Date;
  nextUp: {
    title: string;
    summary: string;
    href: string;
  } | null;
  stats: ReadonlyArray<{
    key: string;
    label: string;
    value: string;
    unit?: string;
    caption?: string;
    tone?: "default" | "success" | "warning" | "danger" | "pr";
  }>;
  activity: ReadonlyArray<{
    id: string;
    title: string;
    when: string;
    tone?: "default" | "success" | "pr";
  }>;
}

export async function getDashboardData(): Promise<DashboardData> {
  // Replace with the real fetch once auth + DB wiring lands.
  return {
    state: "ready",
    user: { firstName: "Sarah" },
    date: new Date(),
    nextUp: {
      title: "Upper-body strength",
      summary: "5 sets · ~ 35 minutes · scheduled for today",
      href: "/workouts/today",
    },
    stats: [
      { key: "weekly", label: "Workouts this week", value: "4", unit: "of 5" },
      { key: "minutes", label: "Active minutes", value: "182", unit: "min" },
      { key: "prs", label: "Personal records", value: "2", tone: "pr" },
      { key: "streak", label: "Day streak", value: "12", tone: "success" },
    ],
    activity: [
      { id: "a1", title: "Bench press — 1RM, 92.5 kg", when: "Yesterday", tone: "pr" },
      { id: "a2", title: "Lower-body endurance", when: "2 days ago" },
      { id: "a3", title: "Mobility flow", when: "3 days ago", tone: "success" },
      { id: "a4", title: "Cardio interval", when: "4 days ago" },
      { id: "a5", title: "Upper-body strength", when: "5 days ago" },
    ],
  };
}
