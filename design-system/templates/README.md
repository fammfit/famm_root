# Templates (L3)

Page-level layouts. Templates show how primitives and patterns fit together
on a real screen. Code lives in `apps/web/src/components/<feature>/` and
the routes under `apps/web/src/app/`; this folder documents the *shape* of
each template so designers and engineers agree before code lands.

## What counts as a template

A template is a screen-shape that:

- Repeats across more than one route (e.g. "list + filter rail + detail
  pane" is a template; the bookings page itself is a route).
- Has a defined responsive behavior across all five breakpoints.
- Defines slots that features fill in.

If a layout appears once and isn't likely to recur, it's a route — not a
template — and lives in `apps/web` without a doc here.

## Current templates

| Template | Status |
|----------|--------|
| `workout-session` | TODO |
| `dashboard` | TODO |
| `entity-list-detail` | TODO |
| `marketing-page` | TODO |

## Contract file template

```markdown
# <Template>

What screens use this and why.

## Used by

- Route 1
- Route 2

## Slots

| Slot | Required | Notes |
|------|----------|-------|

## Responsive behavior

| Breakpoint | Layout |
|------------|--------|
| `<sm` | |
| `sm` | |
| `md` | |
| `lg` | |
| `xl+` | |

## Patterns used

- L2 patterns this template assumes.

## A11y notes

- Landmark roles, focus order, skip-to-content.

## Figma

- Frame path
```

## Examples that will land here

- **`workout-session`** — in-session UI. Large set counter top-center;
  primary action ("Next" / "Done set") thumb-reachable bottom; rest timer
  fills above the action when active.
- **`dashboard`** — grid of `StatCard`s with optional `MetricSeries` row;
  responsive from one-column on phones to four-column on `xl`.
- **`entity-list-detail`** — bookings, exercises, clients. List rail
  collapses to a single column under `md`; selection becomes a route.
- **`marketing-page`** — hero + sections + footer. Quieter palette,
  larger type scale.
