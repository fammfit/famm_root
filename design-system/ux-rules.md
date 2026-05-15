# UX Rules

Rules for designing pages and composing components in FAMM. These are
non-negotiable defaults — break one only with a written reason in the
PR description.

Each section has the same shape: **purpose**, **rules**, **common
mistakes**, and **AI implementation instructions** (what an AI tool
should do when generating UI in this area).

If a rule conflicts with `principles.md`, the principle wins. If a rule
conflicts with `accessibility.md`, accessibility wins.

---

## 1. Page hierarchy

### Purpose
Establish a predictable reading order on every page so users — and
screen readers — can locate the primary action, the title, and the
content without thinking.

### Rules
- **One `<h1>` per page.** It names the page; it is not a tagline.
  Subsequent headings nest sequentially (`h2 → h3 → h4`); never skip
  levels for visual weight.
- **Landmarks are present**: `<main>` exactly once, plus `<nav>`,
  `<aside>`, `<header>`, `<footer>` where they apply.
- **The primary action is visible without scrolling** on the smallest
  supported viewport (375 × 667).
- **A skip-to-content link** is the first focusable element on every
  page.
- **Visible page title** uses `text-2xl font-semibold text-text-primary`
  minimum; section headings step down from there.

### Common mistakes
- Two `<h1>` elements on one page.
- Using `<h3>` for a smaller-looking heading when the document level is
  `h2`.
- Wrapping the entire app in `<main>` and nesting another `<main>`
  inside.
- Marketing-style hero on a product page that pushes the primary action
  below the fold on mobile.

### AI implementation instructions
- Generate exactly one `<h1>` per route file. Default class:
  `text-2xl font-semibold text-text-primary` (larger only on marketing
  pages).
- Wrap page content in `<main>` and place a skip link at the top of the
  layout, not the page.
- When extending or refactoring, **read the existing layout file before
  adding a `<header>` / `<nav>`**. Don't duplicate landmarks.
- Cite the heading structure in your `Design-system decisions:` block:
  "Page hierarchy: h1 → h2 (3 sections) → h3 (2 sub-sections)".

---

## 2. Navigation

### Purpose
Make movement around FAMM predictable. The user always knows where they
are, how they got there, and how to leave.

### Rules
- **Primary navigation** is consistent across the product:
  - Phones: bottom tab bar (4–5 items max).
  - Tablets / desktop: side rail or top nav.
- **Browser back, swipe back, and in-app back all do the same thing.**
  Never `router.replace` to fake a "back" that actually goes forward.
- **Tabs preserve scroll position within a session.** Switching away
  and back returns to the same place.
- **Modals are escape-hatches; routes are bookmarkable.** If a surface
  benefits from a URL (workout detail, profile, payment receipt), it's
  a route. Confirmations, single-field edits, and image previews are
  modals.
- **Don't auto-navigate on background data changes.** Only the user's
  explicit action moves them.
- **Breadcrumbs** appear on `md+` for surfaces three or more levels
  deep. They are *navigation*, not decoration — every segment is a
  link.

### Common mistakes
- Two competing back buttons (browser back goes one place, in-app
  arrow goes another).
- Using a modal where the user might want to share the URL (e.g.
  "Workout details").
- Bottom tab bar with seven items.
- Auto-redirect from `/dashboard` to `/dashboard/today` (breaks back
  button and loses scroll).

### AI implementation instructions
- For new routes, follow Next.js App Router conventions
  (`apps/web/src/app/<segment>/page.tsx`). Don't introduce client-side
  routers.
- When implementing back behavior, **prefer `router.back()` over
  `router.push(parentPath)`**, unless you have a documented reason.
- For a confirmation flow, use a modal/dialog primitive when it lands.
  Until then, ask the user before introducing a one-off dialog.
- Do not create a new tab/nav component if `apps/web/src/components/`
  already contains one. Refactor that one; don't fork.

---

## 3. Calls to action

### Purpose
Make the right action obvious without overwhelming the screen with
competing buttons.

### Rules
- **One primary action per screen.** Use `Button variant="default"`
  exactly once in the visible viewport. Everything else is `secondary`,
  `outline`, or `ghost`.
- **Verb phrases that name the outcome.** "Save changes", "Start
  workout", "Delete account" — never "OK", "Yes", "Continue",
  "Submit".
- **Placement:**
  - Phones: bottom-anchored, full-width or near-full-width, thumb-zone.
    Clears the iOS home indicator.
  - Tablet/desktop: form-aligned (right-aligned at the form footer or
    inline next to the input).
- **Sizing:** `size="lg"` for hero CTAs and form submits; `size="md"`
  default; `size="sm"` only in dense lists; `size="icon"` is 44×44
  always.
- **Loading state** disables the trigger and shows `loading` within
  100ms. Idempotent retries: a failed click leaves the button tappable
  again.
- **Destructive actions use `variant="destructive"`** and confirm via
  dialog (see §8).

### Common mistakes
- Two primary buttons next to each other ("Save draft" + "Continue"
  both `variant="default"`).
- Icon-only buttons in the workout flow.
- Title Case on labels: "Save Changes" → use "Save changes".
- "Click here" or "Learn more" as the entire button label.

### AI implementation instructions
- Import `Button` from `@famm/ui`. Do not author button components.
- Default variant is `default`; only use `destructive`, `outline`,
  `ghost`, `link`, or `secondary` when intent demands.
- Default size is `md`. For phone-primary actions on tall surfaces,
  use `size="lg" className="w-full"`.
- Generate verb-phrase labels in sentence case. Validate against
  `content-guidelines.md` — never produce "OK", "Submit", "Click here".
- If your output has two `variant="default"` buttons visible at once,
  reduce one and note the decision in `Design-system decisions:`.

---

## 4. Forms

### Purpose
Capture user input with the minimum friction and the maximum clarity.
Forms are where conversions live or die.

### Rules
- **Wrap every input in `FormField`** (`@famm/ui`). Bare `<input>` is
  banned in feature code.
- **Labels are always visible.** Never placeholder-only.
- **Validation timing:** validate on blur (when the user leaves the
  field), not on every keystroke. Exception: password strength meters
  and similar feedback-driven inputs.
- **Submit on Enter** inside single-field forms; not inside multi-field
  forms (Enter moves focus there).
- **On submit failure**, focus the first invalid field and scroll it
  into view. Don't just show a banner.
- **Optional fields are marked optional**; required fields get an
  asterisk **and** `aria-required="true"`.
- **The right keyboard:** `inputMode="numeric"` for reps/integers;
  `inputMode="decimal"` for weights that allow fractions;
  `type="email"` / `type="tel"` where applicable.
- **`autocomplete` attribute is set** wherever it makes sense
  (`email`, `current-password`, `one-time-code`, `cc-number`, etc.).
- **Don't clear the form on failure.** The user's data survives the
  error.

### Common mistakes
- Placeholder-only inputs.
- Inline error messages in a tooltip that disappears on focus.
- "Required" indicated only with red border (color-only signal).
- Validating every keystroke and showing red mid-typing.
- Disabling the submit button until the form is valid — the user can't
  tell *why* it's disabled.

### AI implementation instructions
- Import from `@famm/ui`:
  ```tsx
  import { FormField, Input, Button } from "@famm/ui";
  ```
- Compose:
  ```tsx
  <FormField label="Weight" hint="In kg." error={errors.weight} required>
    <Input inputMode="decimal" autoComplete="off" />
  </FormField>
  ```
- Do not author a custom `<label>` + `<input>` pair in feature code.
- On submit error, focus the first invalid field via `ref.focus()` and
  call `scrollIntoView({ block: "center" })`.
- Note in `Design-system decisions:` which `inputMode` and
  `autocomplete` you used and why.

---

## 5. Error states

### Purpose
Tell the user what went wrong and what to do about it, without blame
or jargon.

### Rules
- **Three channels, by severity:**
  - **Toast** — non-critical, auto-dismiss. "Workout saved." for
    success; transient connectivity hiccups.
  - **Banner** — persistent until acknowledged. Payment failed,
    session expiring, must-act-but-not-now.
  - **Dialog** — blocks the surface. Session expired, version
    mismatch, must-act-now.
- **Plain language.** "Couldn't save — check your connection and try
  again" beats "ERR_NETWORK_FAILURE".
- **Always actionable.** Every error has a retry, an alternative path,
  or a clearly stated "what now".
- **Errors carry a non-color signal** — an icon, a `role="alert"`, or
  inline text. Never red border alone.
- **Technical details progressively disclosed.** A short summary;
  `<details>` for stack-style info if it's useful (e.g. "Show error
  code").
- **Errors don't clear user input.** A form failure preserves the
  values.
- **Inline field errors** live under the field, associated via
  `aria-describedby`, with `role="alert"` so they announce.

### Common mistakes
- "An error occurred."
- A toast for a payment failure (it auto-dismisses, the user misses it).
- "Invalid input." with no indication of which field or why.
- Form failure clears all fields.
- Logging the user out on transient API 401s.

### AI implementation instructions
- For form errors, use `FormField`'s `error` prop — it wires
  `aria-invalid`, `aria-describedby`, and `role="alert"` automatically.
- For surface-level errors, render a banner block with
  `bg-signal-danger/10 text-signal-danger` + retry button. Do not use
  raw `bg-red-50` / `text-red-700`.
- For blocking errors that can't be dismissed without action, use a
  dialog (forthcoming primitive — ask before introducing one).
- Generate error copy as: *what failed, what to do*. Never "Oops" or
  "Whoops". Never end with "Please".
- Note in `Design-system decisions:` which channel (toast / banner /
  dialog) and why.

---

## 6. Empty states

### Purpose
Turn "nothing here" into "here's what to do next". An empty state is a
sales opportunity for the next action.

### Rules
- **One sentence, one primary action.** The sentence explains what
  *would* be there; the action fills it.
- **No "Sorry"-style apologies.** Empty is normal.
- **Contextual to the surface.** "No bookings yet" + "Find a trainer"
  on the bookings page; "Log your first workout" on the workout
  history page.
- **Illustration is optional.** When used, it sits above the sentence
  and uses neutral tones — no brand accent.
- **Empty ≠ error.** A failed fetch is an error state, not empty.

### Common mistakes
- A 600px-tall hero with cartoon mascot and no clear next step.
- Showing the empty-state UI while the fetch is still pending.
- Empty state on a paid surface that doesn't say what the paid feature
  gets the user.
- Multiple competing CTAs in an empty state.

### AI implementation instructions
- Compose with `Card` (or a plain layout) + a single `Button`:
  ```tsx
  <Card className="p-inset-xl flex flex-col items-center gap-stack-md text-center">
    <p className="text-text-muted">No bookings yet. Find a trainer to book your first session.</p>
    <Button>Find a trainer</Button>
  </Card>
  ```
- Distinguish empty from loading in the component contract: pass
  separate `loading`, `error`, and `items.length === 0` branches.
- Pull the empty-state copy from `content-guidelines.md` patterns
  ("No X yet. {verb} to {outcome}.").
- Note in `Design-system decisions:` that the empty/loading/error
  states are distinct branches.

---

## 7. Loading states

### Purpose
Bridge the gap between intent and outcome so the user doesn't think
the app froze.

### Rules
- **Show feedback within 100ms** of a user action.
- **Skeletons match the final shape.** A list shows N skeleton rows
  with the same heights as the eventual rows. A card shows a card-
  shaped skeleton.
- **Centered spinner only when the surface is < 200px tall** or when
  the layout truly cannot be predicted.
- **Pending button state** uses the `Button` `loading` prop —
  `disabled` + spinner + `aria-busy="true"`.
- **Optimistic UI for cheap actions** (toggle, like, mark-complete) —
  reflect the change immediately, reconcile on response, roll back on
  failure.
- **Progressive rendering** for slow surfaces: render headers and
  metadata first; data fills in.
- **Never hide existing content while reloading.** Show the stale data
  with a subtle pending indicator until the new data arrives.

### Common mistakes
- Full-page spinner replaces the entire dashboard while one widget
  reloads.
- Skeleton that's a different shape from the loaded content (layout
  shift on data arrival).
- Disabled "Save" button with no spinner — user thinks the click was
  ignored.
- Optimistic UI without rollback on failure.

### AI implementation instructions
- Import `Spinner` from `@famm/ui` only for genuinely tiny surfaces.
- For lists: generate a `<ListSkeleton count={n} />` (or local
  skeleton) matching the row layout — same heights, same gaps.
- For buttons: use `loading={isPending}` on `Button`; do not roll your
  own spinner.
- For optimistic mutations, wrap in a try/rollback pattern:
  ```ts
  setItems(optimistic);
  try { await mutate(); } catch (e) { setItems(previous); throw e; }
  ```
- Note in `Design-system decisions:` whether the surface uses
  skeletons, optimistic updates, or both, and where rollback happens.

---

## 8. Confirmation states

### Purpose
Add friction where mistakes are expensive. Save the user from
themselves — but only when the cost justifies the interruption.

### Rules
- **Destructive actions confirm via dialog.** Delete, cancel-paid-
  booking, reset-progress. The confirm button is `variant="destructive"`
  and carries the *destructive verb* ("Delete workout"). Cancel is
  plain text or `variant="ghost"`.
- **Non-destructive actions don't confirm.** Saving, navigating,
  toggling. Friction here is friction lost.
- **Confirmation copy explains the consequence**, not the action: "This
  will permanently delete 12 logged workouts."
- **Undo when possible.** A toast with an "Undo" action is better than
  a confirmation dialog when the action is reversible within a few
  seconds.
- **Multi-step confirms** (typing the resource name to confirm
  deletion) are reserved for truly irreversible, expensive operations:
  account deletion, studio deletion.
- **Post-action feedback.** Confirmations succeed with a past-tense
  toast: "Workout deleted." Not "Success!".

### Common mistakes
- Confirm-on-save (interrupts every form).
- "Are you sure?" with no statement of consequence.
- Dialog with the destructive verb on the *cancel* button (visual
  symmetry trick — banned).
- Toast for a destructive confirmation (user misses it, action
  completes).

### AI implementation instructions
- Use a dialog primitive when it lands. Until then, ask before
  introducing a one-off destructive flow.
- The confirm button: `<Button variant="destructive">{destructive verb}</Button>`.
- The cancel button: `<Button variant="ghost">Cancel</Button>`.
- Always include the consequence in the body: "This will permanently
  remove…".
- For reversible actions, prefer toast + undo over a confirm dialog.
  Note this choice in `Design-system decisions:`.

---

## 9. Tables and data displays

### Purpose
Present rows of structured data so users can scan, sort, and act
without losing context.

### Rules
- **Use a `<table>` for tabular data.** Grid-of-divs is not tabular and
  fails screen readers.
- **Column headers** are `<th scope="col">`; row headers
  `<th scope="row">`. Sortable headers carry `aria-sort`.
- **Tabular numerals** on numeric columns (`tabular-nums`); align
  numbers right or by decimal.
- **Sticky header on long tables** so column meaning persists during
  scroll.
- **Mobile collapse strategy** — long tables stack into cards under
  `md`. Decide the strategy per table; document it in the contract.
- **Empty cells get an em-dash**, not "N/A" or an empty cell. "—" is
  visually quiet and unambiguous.
- **Row actions** sit in a final column with an icon button or kebab
  menu, with `aria-label` describing the row + action.
- **Pagination or virtualization** above 100 rows; never render 10,000
  rows at once.
- **Selection state** is visually distinct (background, not just
  checkbox) and announced (`aria-selected`).

### Common mistakes
- Grid layout pretending to be a table (no headers, no row navigation).
- Right-aligned numbers without `tabular-nums` (decimals don't line up).
- Mobile fallback that hides columns and loses information.
- Sortable headers without `aria-sort`.
- Action buttons crammed into the last column with no label.

### AI implementation instructions
- Generate `<table>` with `<thead>`, `<tbody>`, and `<tfoot>` when
  applicable.
- Style headers with `text-text-muted text-xs uppercase tracking-wide`.
- Style numeric cells with `tabular-nums text-right`.
- For mobile collapse, generate a parallel card layout shown under
  `md` and the table from `md` up. Don't try to make the same DOM work
  at both sizes.
- For row actions, use `<Button size="icon" aria-label="Edit {row name}">`
  — never icon-only without a label.
- Note in `Design-system decisions:` the mobile strategy chosen.

---

## 10. Mobile-first behavior

### Purpose
FAMM is used in the gym, on phones, often one-handed and sweaty. Mobile
is the primary surface, not a derivative.

### Rules
- **Default styles target the smallest supported viewport (375 × 667).**
  Breakpoints add capability upward: `sm:` adjusts at 480px, `md:` at
  768px, `lg:` at 1024px, `xl:` at 1280px.
- **Touch is the assumed input below `lg`.** Hover-reveals and
  right-click affordances must have a touch equivalent (long-press,
  kebab).
- **44×44 minimum touch target** at every breakpoint and every
  orientation. Don't shrink for "density".
- **Thumb-reach zone** is the bottom third on phones. Primary actions
  live there.
- **Body text ≥ 16px on mobile** — never `text-sm` for body copy. Below
  16px on iOS triggers zoom-on-focus for inputs.
- **Bottom-pinned actions** use `env(safe-area-inset-bottom)` so they
  clear the iOS home indicator.
- **No horizontal scroll** except intentional carousels with snap.
- **In-session UI legible in landscape on phones** — users prop their
  phone sideways during cardio.
- **Don't disable zoom.** Allow user scaling in viewport meta.

### Common mistakes
- Designing the desktop first and "making it responsive" by hiding
  columns.
- 14px body text on mobile (causes input zoom).
- Fixed-pixel widths that overflow at 360px.
- Hover-only menus on touch.
- Bottom CTA covered by the iOS home indicator.

### AI implementation instructions
- Write default styles without prefixes; add `sm:` / `md:` / `lg:` for
  enhancements:
  ```tsx
  // Mobile-first: one column, expanding on lg.
  <div className="grid grid-cols-1 gap-stack-md lg:grid-cols-3">
  ```
- Default `text-base` (16px) for body copy. `text-sm` only for hints,
  metadata, table cells.
- For bottom-pinned bars on full-bleed surfaces, generate:
  ```tsx
  <div className="sticky bottom-0 p-inset-md pb-[max(theme(spacing.inset-md),env(safe-area-inset-bottom))]">
  ```
- After generating UI, mentally walk it at 375 / 768 / 1280 — if a
  horizontal scroll appears or text shrinks below 16px on mobile,
  fix it before reporting done.
- Note in `Design-system decisions:` "verified mobile-first at 375 /
  768 / 1280".

---

## 11. Dashboard layouts

### Purpose
Surface the metrics and actions a user needs to make their next
decision, without overwhelming them with everything FAMM knows.

### Rules
- **One primary focus per dashboard.** "What should I do today?"
  answered above the fold. Everything else is supporting context.
- **KPI row at the top** — three to five `StatCard`s. Five is the
  maximum; six is a redesign.
- **Group by question, not by data source.** "This week's training" is
  a question; "Workouts table" is a data source. Users ask the former.
- **Time controls are explicit** ("This week" / "Last 30 days") and
  default to the user's most-asked window.
- **Refresh strategy:** background refresh keeps stats fresh; the user
  doesn't trigger it. Surface a "Last updated 2m ago" only when the
  data is materially stale (> 5 min for live dashboards).
- **Customizable order is opt-in**, not default. Most users want the
  default ordering.
- **Drill-down via routes**, not modals. Clicking a KPI navigates to
  the detail page.
- **Empty dashboards have a single "Start your first X" action**, not
  a wall of zero-value stat cards.

### Common mistakes
- 12 stat cards above the fold (no hierarchy, no focus).
- Identical-looking cards where one is a stat and one is an action.
- Charts with three axes and a legend that explains nothing.
- A dashboard that's actually a settings page.
- Modals for KPI drill-down (loses URL, loses sharing).

### AI implementation instructions
- Compose the KPI row with the `StatCard` pattern:
  ```tsx
  <section
    aria-labelledby="kpi-heading"
    className="grid grid-cols-1 gap-stack-md sm:grid-cols-2 lg:grid-cols-4"
  >
    <h2 id="kpi-heading" className="sr-only">This week</h2>
    <StatCard label="Volume" value="24,160" unit="kg" />
    <StatCard label="Streak" value="5" unit="days" />
    <StatCard label="Last PR" value="Squat 140kg" tone="pr" />
    <StatCard label="Sessions" value="3" />
  </section>
  ```
- Use `tone="pr"` *only* when the metric is an actual personal record.
- For drill-down, wrap `StatCard` in a `<Link href="…">` from `next/link`.
  Don't introduce modal-based drill-downs.
- Note in `Design-system decisions:` the dashboard's primary focus and
  why each KPI made the cut.

---

## 12. Marketing pages

### Purpose
Convert visitors into sign-ups, free-trials, or bookings. Marketing
pages live in the same system but breathe differently — larger type,
slower scroll, more whitespace.

### Rules
- **Hero structure**: H1 promise + one supporting sentence + one
  primary CTA. Nothing else above the fold.
- **The first CTA is the most important one.** It's the largest, the
  most contrasted, and it appears again at the end.
- **Social proof early.** Logos, ratings, or quotes within the first
  scroll on desktop, near the hero on mobile.
- **One conversion path per page.** A landing page does not have six
  competing CTAs.
- **Larger type scale** than product surfaces: `text-5xl` to `text-7xl`
  for H1; `text-xl` for body. Breathing space (`p-inset-xl`,
  `gap-stack-xl`) is normal.
- **Brand color is allowed more freely** than in product (#9 still
  applies — don't paint everything accent), but the accent appears in
  the hero CTA and the closing CTA, not on body text.
- **No surprise interactions.** Marketing pages don't open modals on
  scroll, don't auto-play video with sound, don't pop up newsletter
  prompts before the user reaches the content.
- **Performance is part of the design.** A marketing page that loads
  slowly converts worse. Optimize images; defer below-the-fold scripts.

### Common mistakes
- Hero with three CTAs at the same size.
- Auto-playing carousel that the user can't pause.
- Newsletter modal triggered on page load.
- 18px body text on mobile (marketing convention is larger, not
  smaller).
- Decorative animations on every section (sea-sickness).

### AI implementation instructions
- Use the `marketing-page` template (`design-system/templates/`) as
  the structural reference.
- Hero composition:
  ```tsx
  <section className="px-inset-xl py-inset-xl flex flex-col items-center gap-stack-lg text-center">
    <h1 className="text-5xl md:text-6xl font-semibold text-text-primary">
      Train smarter, with the team behind you.
    </h1>
    <p className="text-lg text-text-secondary max-w-prose">
      One supporting sentence that promises the outcome.
    </p>
    <Button size="lg">Start your free trial</Button>
  </section>
  ```
- Repeat the hero CTA at the page footer; do not introduce a third.
- Use `useReducedMotion()` on any animated section.
- Note in `Design-system decisions:` the single conversion path and
  the social-proof placement.

---

## 13. Onboarding flows

### Purpose
Get a new user from "I just signed up" to "I did the thing once" with
the minimum number of steps and the maximum number of sensible
defaults.

### Rules
- **Minimum viable onboarding.** Ask only what's needed to make the
  first useful action work. Everything else is a "polish your profile"
  surface deferred until later.
- **Sensible defaults beat questions.** If the answer is "kg" 80% of
  the time, default to kg.
- **Skip everywhere.** Every step has a "Skip" or "I'll do this later"
  unless the field is required for the first action.
- **Progress indicator on multi-step flows.** "Step 2 of 4". Don't
  hide progress.
- **Save as you go.** Don't lose work if the user backs out mid-flow.
- **The first action is real.** The end of onboarding is the user
  doing the thing — logging a workout, booking a session — not a
  "you're all set!" screen.
- **No "tooltip tours"** of the UI. If the UI needs a tour, it's not
  clear enough (#1).
- **Defer personalization.** Asking for goals, body data, payment
  details during onboarding cuts conversion. Ask them in context, when
  they matter.

### Common mistakes
- 12-step onboarding before the user sees the product.
- Required payment info before any value is delivered.
- Tooltip tours that explain icons the icons should have explained.
- "Skip" hidden under a kebab while "Continue" is full-width.
- Losing the user's entered values when they hit Back.

### AI implementation instructions
- Structure as a stepped flow with explicit `step` state. Persist
  state to the URL (`?step=2`) or localStorage so back/refresh works.
- Generate each step with one focused task and a clear `Skip` button
  using `<Button variant="ghost">Skip</Button>`.
- Default values:
  ```tsx
  <FormField label="Preferred unit">
    <RadioGroup defaultValue="kg">…</RadioGroup>
  </FormField>
  ```
- The final step's CTA is the *first real action*: "Log first
  workout", not "Finish".
- Show a progress indicator at the top using sentence-case
  ("Step 2 of 4"), never a percentage.
- Note in `Design-system decisions:` how many steps were used, what
  defaults were assumed, and what was deferred.

---

## How AI tools should use this file

Before generating UI in any of the areas above:

1. **Identify which section applies.** A booking confirmation touches
   §3 (CTA), §4 (form), §8 (confirmation), §10 (mobile-first).
2. **Read the relevant sections.** Each one above has a self-contained
   contract.
3. **Compose with `@famm/ui`** following the AI instructions in each
   section. Do not invent layouts where the section spells one out.
4. **Verify the common mistakes list.** Your output must not match any
   of them.
5. **Report decisions** in the `Design-system decisions:` block at the
   end of your reply (per `.cursor/rules/01-ux-ui-system.mdc`).

If the user request spans multiple sections and their rules conflict
(rare), the conflict-resolution order in `principles.md` decides.
