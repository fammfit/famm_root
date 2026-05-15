# UX Rules

Behavior rules that hold across every screen in FAMM. If a feature breaks one
of these, that's a bug — not a "design choice".

## Actions

- **One primary action per screen.** Use `Button variant="default"` exactly
  once in the visible viewport. Everything else is `secondary`, `outline`, or
  `ghost`. If two actions feel equally important, the screen has two screens.
- **Destructive actions confirm.** Delete, cancel-paid-booking, reset-progress
  — all open a `Dialog` (when it lands) with the destructive verb on the
  confirm button (`Button variant="destructive"`). Never confirm via toast.
- **Async actions show progress within 100ms.** Disable the trigger, show
  `loading` state. Don't wait for the network — the optimistic state is
  cheaper than a confused user tap-tap-tapping.
- **Idempotent retries.** If a button can fail (network), failing once leaves
  it tappable again with the same effect. Never half-commit.

## Navigation

- **Back is back.** Browser back, swipe back, and the in-app back affordance
  all do the same thing. Don't override browser history.
- **Tabs preserve scroll position** within a session. Switching tabs and
  returning lands where the user left.
- **Modals are escape-hatches.** Anything that benefits from a permalink
  becomes a route, not a modal. Workout details, profile, payment history:
  routes. Confirm-destructive, single-field edits, image preview: modal.
- **Don't auto-redirect on data state changes** unless the user just acted.
  Background refreshes never navigate.

## Forms

- **Wrap every input in `FormField`.** Label, hint, and error live with the
  control — never floating above the form. Never placeholder-only.
- **Validate on blur, not on keystroke.** Show success/error state when the
  user leaves the field, not while they type. Exception: password strength
  meter and similar feedback-driven inputs.
- **Submit on Enter** within single-field forms; not within multi-field forms
  (Enter moves focus there).
- **Show the failed field on submit error.** Scroll it into view and focus it.
  Don't just show a banner.
- **Numbers get the right keyboard.** `inputMode="numeric"` for weights and
  reps; `inputMode="decimal"` only when fractions are actually allowed.

## Empty / loading / error states

Every list or fetch surface has all four:

| State | Behavior |
|-------|----------|
| Loading | Skeleton matching the final shape. Never a centered spinner unless the surface is < 200px tall. |
| Empty | One sentence explaining why it's empty + a primary action that fills it. |
| Error | Plain-language description + retry button. Surface the underlying error to a `details` element if it's actionable. |
| Loaded | The actual content. |

The four states are written into the component, not the page. A page that
calls `<BookingsList items={[]} loading={false} error={...} />` does not
re-implement them.

## Feedback

- **Toasts are non-critical.** They are dismissed automatically. Anything the
  user *must* see — failed payment, expired session — is a modal or banner.
- **Toast duration:** 4s default; 7s if it has an action. Errors persist
  until dismissed.
- **One toast at a time.** Newer toasts replace older ones; never stack.
- **Haptics on completion** (mobile-web tap target only): set complete,
  workout complete. Never on idle UI changes.

## Workouts (domain-specific)

- **The set counter is the largest thing on screen** during a session.
  `text-5xl` minimum on phones.
- **The next-action button is thumb-reachable** at the bottom of the screen
  on phones. Never top-right during a workout.
- **PR moments use `signal.pr` + a single celebration animation**, never
  ambient color.
- **Rest timers don't auto-dismiss.** The user dismisses them, even at 0s,
  because they may be mid-rep when it fires.

## Data & money

- **Localize numbers and dates** at the edge (component), not in the data
  layer. Use `Intl.NumberFormat` / `Intl.DateTimeFormat`.
- **Show currency with the symbol prefix and no abbreviations.** "$24.00",
  not "24 USD" or "24.00$".
- **Never round money for display.** Always two decimal places.
- **Weights show the user's preferred unit** (kg/lb). Convert at the edge.
  Internal storage is always SI (kg, seconds, meters).
