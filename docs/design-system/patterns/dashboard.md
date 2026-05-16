# Dashboard

Status: Pattern documentation. Applies to the authenticated home
surface at `apps/web/src/app/(app)/page.tsx` and to any
"today / overview" page inside the product (e.g. a trainer's day view).

A dashboard is the logged-in user's first stop. It answers, in this
order: **what's next, what changed, where am I?** Done well, a
dashboard is empty when there's nothing to do — it doesn't manufacture
fake data to fill space.

There is one canonical FAMM dashboard layout. Sub-surfaces (trainer
dashboard, admin dashboard) inherit it and may replace cards but not
the section grid.

---

## 1. Purpose

Show a returning user the smallest set of cards that lets them resume
the product in one tap.

The pattern owns:

- Greeting + date header.
- "Next up" card (the resume affordance — start workout, join session).
- A row of stat cards summarising the last 7 days.
- A "recent activity" feed.
- Quick-action shortcuts (log a set, contact trainer).

Dashboards are scannable, not exhaustive. Full data lives on dedicated
routes; the dashboard links into them.

---

## 2. Recommended layout

Top to bottom:

1. **Greeting strip.** "Good morning, Sarah." + today's date. Skeleton
   on first paint; never blank.
2. **Next up.** A single, prominent `Card` (often a feature L3
   composition: `NextWorkoutCard`) with a primary `Button` ("Start
   workout"). If the user has nothing scheduled, an `EmptyState` here
   suggests a sensible next action.
3. **Stats row.** 3–4 `StatCard`s (already L2): "Workouts this week",
   "Active minutes", "Personal records", "Streak". Equal width.
4. **Activity feed.** Last 5 events as rows (a `WorkoutRow` L2
   pattern), with a "See all" link to `/history`.
5. **Shortcuts.** 2–3 secondary actions as `Button variant="secondary"`
   or `ghost` — "Log a set without a workout", "Message trainer".

Section spacing `space.stack.lg`; intra-section `space.stack.md`.

---

## 3. Required components

All from `@famm/ui`:

- `Navigation` (`context="product"`) — site chrome.
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`.
- `StatCard` (L2).
- `WorkoutRow` (L2) for the feed rows.
- `Button` for primary and secondary actions.
- `Badge` for streak / PR markers.
- `Toast` for the imperative `toast.success("Workout saved.")` after
  a logged action returns to the dashboard.
- `Skeleton` (via `Loading states` pattern) for initial paint.

If a dashboard tile can't be expressed as `Card` + an L1/L2 primitive,
it's a new pattern — open a ticket before building.

---

## 4. Content hierarchy

- **H1.** "Today" or the user's first name + "Today" — exactly once
  per page. Never the product name.
- **H2.** Section headings ("Your week", "Recent activity",
  "Shortcuts").
- **H3.** Card titles inside sections (`CardTitle` renders `<h3>`).
- **Body.** `font.role.body`. Numeric values use `font.role.mono`.

Copy rules:

- Numbers are the loudest thing on a stat card. The label is small;
  the value is large.
- Time references are relative for the last 24 hours ("3h ago"),
  absolute beyond ("May 12").
- Empty greetings still greet — never render a blank top strip.
- Don't celebrate non-events. "Welcome back!" every visit is noise; a
  PR badge is a celebration.

---

## 5. Responsive behavior

| Breakpoint | Layout                                                   |
|------------|----------------------------------------------------------|
| `<sm`      | Single-column. Next-up card is the entire viewport width. Stats stack 2-per-row, then 1. |
| `sm`–`md`  | Single-column. Stats 2-per-row.                          |
| `md`–`lg`  | Two-column on the upper half (next-up left, stats right grid 2×2). Activity full-width below. |
| `≥lg`      | Three-column on the upper half (next-up + stats row + shortcuts column). |

The header strip is sticky on `≥md` so the greeting + actions remain
visible during scroll.

---

## 6. Accessibility requirements

- **Landmarks.** `<header>`, `<main>` (the dashboard body), `<footer>`.
  Each major section is a `<section aria-labelledby="...">`.
- **One H1 per page.** Section H2s are siblings.
- **Live regions.** The "Next up" card is wrapped in
  `aria-live="polite"` so updates (e.g. a workout becoming available)
  are announced.
- **Skeletons.** Loading skeletons carry `aria-busy="true"` on the
  region; once data arrives, the busy state clears.
- **Keyboard.** Tab order follows visual order: greeting → next-up →
  stats row → activity → shortcuts. No focus traps; no autofocus
  beyond the "Skip to main content" link.
- **Touch targets.** Every interactive card-level link / button is
  44×44 minimum.
- **Color independence.** PR / streak badges carry both color and
  text — never a colored dot alone.
- **Reduced motion.** Stat-card number tickers collapse to an instant
  paint under `prefers-reduced-motion`.

---

## 7. Conversion considerations

Conversion on a dashboard is engagement, not signup. Goals:

- **Time-to-resume ≤ 5s.** Pre-render the "next up" card on the server
  so it lands on first paint. Don't gate it behind a client-side
  query.
- **One primary action.** The next-up `Button` is the only `default`
  variant on the page. All other buttons are `secondary` or `ghost`.
- **Empty dashboards drive setup, not despair.** A new user's
  dashboard surfaces "Create your first plan" instead of zero-value
  stats.
- **Streaks are reward, not pressure.** Don't ping the user that
  they're about to lose a streak — that's a notification, not the
  dashboard's job.
- **Personalisation is data, not theme.** Greet by name, show real
  numbers; don't theme the dashboard differently per user — drift
  city.
- **Server-rendered cards** for above-the-fold content (no spinners
  for known data).

---

## 8. Common mistakes

- Building a kitchen-sink dashboard with every available metric. The
  dashboard is a triage view; full data is elsewhere.
- A spinner over the entire page while data loads. Pre-render the
  shell and skeleton individual cards.
- Replacing real data with placeholder zeros (`0 workouts`) for new
  users. Show an `EmptyState` with a next step instead.
- Cramming five primary CTAs. One per page.
- Activity feed showing a hundred items inline. Five plus a "See all"
  link.
- Stat cards without a unit. "12" is not a stat; "12 workouts" is.
- Custom card sizes — every stat card is the same width inside a row.
- Auto-refreshing the dashboard with a global poll. Drive updates via
  the toast system on user action; the dashboard doesn't reload
  itself.

---

## 9. AI implementation instructions

1. **Route.** Authenticated home is `apps/web/src/app/(app)/page.tsx`.
   The route is a Server Component; client state lives in cards as
   needed.
2. **Compose from `@famm/ui`.** Use `Card`, `StatCard`, `WorkoutRow`,
   `Button`. No raw markup for cards.
3. **Server-render the next-up card.** Don't put a spinner there —
   the URL implies the user is authenticated, so the server can
   resolve it.
4. **One H1 per page.** "Today" or the user's first name.
5. **One primary `Button`.** All other actions are `secondary` or
   `ghost`.
6. **Skeletons** (see `loading-states.md`) appear only for data not
   pre-fetched. Don't skeleton known values.
7. **Live region** on the next-up card. Toast on completed actions —
   never a redirect.
8. **Don't auto-refresh.** Updates come from user action or pushed
   events; the page doesn't poll.
9. **Empty states** (`empty-states.md`) replace stat cards when the
   user has no data — don't render "0".
10. **Analytics.** Fire `dashboard_view` once per session; card-level
    clicks fire `dashboard_card_click` with the card key. Don't
    sprinkle per-component events.
