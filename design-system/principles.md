# Design Principles

Ten principles that guide every UX, UI, and code decision in FAMM. They
apply equally to humans designing in Figma, engineers writing components,
and AI tools generating UI.

Each principle has the same shape: **what it is**, **why it matters**,
**practical rules**, and a **good / bad** example.

## How to use these in conflict

When two principles disagree, resolve in this order:

1. **Accessibility** (#3) — never traded. The floor, not a feature.
2. **Clarity** (#1) — the user must understand what they see.
3. **Conversion** (#4) — the user must be able to act.
4. **Consistency** (#2) — reduces cognitive load, but a single feature
   may justify a deviation if (1)–(3) demand it.
5. Everything else is balance.

In review or PR comments, point at a numbered principle rather than at
personal taste. "Violates #9 — the streak banner shouldn't pulse unless
the user actually hit a streak" is a stronger argument than "I don't
like the animation".

---

## 1. Clarity

### Definition
The user understands what they see in the time available. On a FAMM
workout screen, that time is roughly **two seconds** of attention. On a
booking page, longer — but never assume long.

### Why it matters
Most product failures are misunderstanding, not bad pixels. A user who
can't tell which set is current, which button is the next action, or
whether a save succeeded will leave or tap the wrong thing.

### Practical rules
- The **most important number on the screen is the largest**: set count
  during a workout, remaining time in a timer, current weight in a log
  row.
- Every screen has **one primary action** (`Button variant="default"`)
  in the visible viewport. If two actions feel equally important, the
  screen is two screens.
- Icons that convey meaning are paired with a text label, especially
  during in-session UI. Icon-only is for ambient affordances only.
- Loading states match the final shape (skeleton), so the user knows
  what's coming.

### Good
```tsx
// Set counter dominates; next-action button thumb-reachable bottom.
<div className="flex flex-col items-center gap-stack-lg">
  <span className="text-6xl font-semibold tabular-nums text-text-primary">
    {currentSet}/{totalSets}
  </span>
  <Button size="lg" className="w-full">Next set</Button>
</div>
```

### Bad
```tsx
// Counter buried; next-action competing with three secondary buttons.
<div className="flex items-center gap-inline-sm">
  <Button variant="ghost">History</Button>
  <Button variant="ghost">Notes</Button>
  <span className="text-base text-text-muted">Set {currentSet} of {totalSets}</span>
  <Button variant="ghost">Edit</Button>
  <Button>Next</Button>
</div>
```

---

## 2. Consistency

### Definition
The same thing looks the same and behaves the same across the product.
A button is a button is a button. A destructive confirm is always a
modal, never a toast.

### Why it matters
Inconsistency forces the user to re-learn the product on every screen.
It also fragments the codebase — three slightly different buttons mean
three places to fix the next a11y bug.

### Practical rules
- Use the design tokens (#10) and the existing components (#6). Don't
  invent visual variants — propose them through the system.
- Cross-product behaviors are the same: Escape closes modals, Tab moves
  focus in visual order, destructive actions confirm via dialog.
- Domain words are constant: "workout", "set", "PR" — never aliases
  (see `content-guidelines.md`).
- A given semantic token has one meaning. `signal.pr` is reserved for
  personal records; don't reuse the gold elsewhere.

### Good
```tsx
// Reuses the Button primitive; variant communicates intent.
import { Button } from "@famm/ui";
<Button variant="destructive">Delete workout</Button>
```

### Bad
```tsx
// New file, hand-rolled, slightly different hover and radius.
function DeleteButton({ children, ...props }) {
  return (
    <button
      className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2"
      {...props}
    >
      {children}
    </button>
  );
}
```

---

## 3. Accessibility

### Definition
Every interactive element is reachable, perceivable, and operable by
every user — keyboard-only, screen-reader, low-vision, motor-limited,
reduced-motion. Baseline: **WCAG 2.2 Level AA**.

### Why it matters
Accessibility is a legal and ethical floor. It is also a product floor:
the same affordances that help a screen-reader user (clear labels,
predictable focus, semantic HTML) help every user under stress, on a
small screen, or in a noisy gym.

### Practical rules
- **Semantic HTML.** `<button>`, `<a>`, `<input>`, `<dialog>` — not
  `<div>` with handlers.
- **Visible focus ring** on every interactive element. Never
  `outline-none` without a replacement of equal or better contrast.
- **44×44 minimum touch target** on touch viewports.
- **Forms** wrap inputs in `FormField`; never bare `<input>` in feature
  code.
- **Color is never the only signal.** Errors are red and labelled. PRs
  are gold and labelled.
- **Live regions** (`aria-live`) for changing data (timers, set
  counters, async results).
- **Reduced motion respected** via `useReducedMotion()` from `@famm/ui`.
- Contrast: body text ≥ 4.5:1, large text ≥ 3:1, UI graphics ≥ 3:1.

See `accessibility.md` for the binding details.

### Good
```tsx
import { FormField, Input } from "@famm/ui";

<FormField
  label="Weight"
  hint="Enter the working weight in kg."
  error={errors.weight}
>
  <Input inputMode="decimal" autoComplete="off" />
</FormField>
```

### Bad
```tsx
// No label, custom button, no focus ring, gray icon-only error signal.
<div>
  <input type="text" placeholder="Weight" className="border rounded p-2" />
  {errors.weight && <span className="text-gray-500">!</span>}
  <div onClick={onSave} className="bg-blue-600 text-white p-2 outline-none">
    Save
  </div>
</div>
```

---

## 4. Conversion

### Definition
The user can complete the task they came for. The path from intent to
outcome is shorter than the path to abandonment.

### Why it matters
A clear, accessible, consistent screen still fails if it doesn't let
the user *do the thing*. Conversion is what closes the gap between
"this looks nice" and "this works".

### Practical rules
- **Primary action is unmissable.** Bottom-thumb-zone on phones,
  top-right on dashboards. One per screen.
- **Forms ask only what's needed.** Defer optional fields to a separate
  "polish your profile" surface.
- **Errors are recoverable.** Show what went wrong and what to do; don't
  clear the form on failure.
- **Optimistic UI for cheap actions** (toggle, like, mark-complete) —
  reconcile on response.
- **Friction goes on confirm, not on intent.** Don't ask "are you sure?"
  for save; do ask for delete.
- **Default values are usually right.** A "Book session" form
  pre-selects the user's last trainer, last time slot, last duration.
- **Empty states sell the next step.** Every empty state has one
  primary action that fills it.

### Good
```tsx
// One unambiguous primary action; remembers the last value.
<form onSubmit={book}>
  <FormField label="Trainer">
    <TrainerPicker defaultValue={lastUsedTrainer} />
  </FormField>
  <FormField label="When">
    <SlotPicker defaultValue={nextAvailableSlot} />
  </FormField>
  <Button type="submit" size="lg" className="w-full mt-stack-lg">
    Book session
  </Button>
</form>
```

### Bad
```tsx
// 12 fields, half optional, no defaults, two competing CTAs.
<form>
  {/* …all 12 fields… */}
  <div className="flex gap-inline-sm">
    <Button variant="outline">Save draft</Button>
    <Button>Continue</Button>
  </div>
</form>
```

---

## 5. Responsiveness

### Definition
The product works at every size we support — from a 360 px phone in
portrait to a 1536 px monitor — and switches gracefully between input
modes (touch, pointer, keyboard).

### Why it matters
FAMM is used on phones in the gym, on tablets in trainer studios, and
on laptops at desks. "It works on my screen" is the most expensive
words a developer can say.

### Practical rules
- **Mobile-first.** Default styles target the smallest supported
  viewport; breakpoints add capability upward, never the reverse.
- **Use layout primitives** (`Stack`, `Cluster`, `Grid` when they land)
  instead of repeated media queries inside features.
- **No horizontal scroll** except intentional carousels with snap.
- **Body text ≥ 16px on mobile.** Never `text-sm` for body copy.
- **Tabular numerals** in any column of numbers (`tabular-nums`).
- **Touch is assumed below `lg`.** Hover-only affordances must have a
  touch equivalent (long-press, kebab menu).
- **Touch targets stay 44×44** at every breakpoint and orientation.
- **In-session UI legible in landscape on phones** — users prop their
  phone sideways during cardio.
- **Verify at three viewports minimum**: 375 × 667, 768 × 1024,
  1280 × 800.

### Good
```tsx
// One column on phones, three on lg; tokens for spacing.
<div className="grid grid-cols-1 gap-stack-md lg:grid-cols-3">
  {stats.map((s) => <StatCard key={s.id} {...s} />)}
</div>
```

### Bad
```tsx
// Fixed pixel widths; breaks below 360 px; no responsive intent.
<div className="flex" style={{ width: "1024px" }}>
  <StatCard className="w-[320px]" />
  <StatCard className="w-[320px]" />
  <StatCard className="w-[320px]" />
</div>
```

---

## 6. Reusability

### Definition
There is one canonical implementation of a UI element, and the system
extends rather than duplicates it. The tier model (Tokens → L1 → L2 →
L3) decides where new behavior belongs.

### Why it matters
Duplication is how design systems die. Two buttons become five buttons
become twelve buttons, each with slightly different a11y, dark-mode,
and motion bugs.

### Practical rules
- **Search before you create.** Grep
  `packages/ui/src/components/{primitives,patterns}` and
  `packages/ui/src/index.ts` before writing JSX.
- **Extend > fork.** Add a `cva()` variant to the existing primitive;
  do not create `MyFeatureButton`.
- **Place by tier:**
  - Cross-feature reuse → L2 pattern.
  - Feature-specific one-off → L3.
  - New atomic primitive → DS-owner approval first.
- **Promote when a feature-specific component shows up in a second
  feature.** Open a promotion PR.

### Good
```tsx
// Extend an existing primitive.
// packages/ui/src/components/primitives/button.tsx
variant: {
  default: "...",
  destructive: "...",
  // Added in PR #123 — used by trainer dashboard and member workout.
  emphasis: "bg-accent-subtle text-accent border border-accent",
},
```

### Bad
```tsx
// New file, new name, duplicates 90% of Button.
// apps/web/src/components/dashboard/dashboard-action-button.tsx
export function DashboardActionButton(props) {
  return <button className="..." {...props} />;
}
```

---

## 7. Content hierarchy

### Definition
The user's eye lands on the most important thing first, then naturally
flows to the next-most-important. Hierarchy is built from **size,
weight, contrast, position, and whitespace** — in that order.

### Why it matters
Without hierarchy, every element competes equally. The user scans,
finds nothing, and leaves. Hierarchy is the silent narrator of every
screen.

### Practical rules
- **One H1 per page.** Subsequent levels nest sequentially (h2, h3, …).
- **Size and weight do the heavy lifting**: heading sizes are at least
  one step apart on the scale. Body text is one weight (regular);
  emphasis bumps to medium.
- **Color is a tie-breaker, not a starter.** Don't introduce `accent`
  to create hierarchy that size and weight could have produced.
- **Tabular alignment** for any column of numbers; align decimals.
- **Whitespace separates groups.** Use `gap-stack-*` between groups,
  `gap-stack-xs` inside a group.
- **Prefer fewer levels.** Three levels of hierarchy on a single
  screen is plenty; four is a redesign signal.

### Good
```tsx
// Title, then value, then caption — each visibly demoted from the last.
<Card className="p-inset-lg">
  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
    This week
  </p>
  <p className="mt-stack-xs text-3xl font-semibold tabular-nums text-text-primary">
    24,160 kg
  </p>
  <p className="mt-stack-xs text-sm text-text-muted">+12% vs last week</p>
</Card>
```

### Bad
```tsx
// Three roughly equal weights & sizes; eye has nowhere to land.
<Card>
  <p className="text-lg">This week</p>
  <p className="text-lg">24,160 kg</p>
  <p className="text-lg text-accent">+12% vs last week</p>
</Card>
```

---

## 8. Progressive disclosure

### Definition
Show the user what they need now; reveal more on request. Defaults are
sensible; advanced controls live behind an affordance.

### Why it matters
A surface that shows every option upfront is a surface that asks the
user to learn it before using it. FAMM is for moving humans, not
configuration auditors.

### Practical rules
- **Defaults are usually right.** The mode 80% of users want should
  work without touching settings.
- **Advanced controls live in a labelled disclosure** — "More options",
  "Advanced", a kebab menu, an accordion — not on the main surface.
- **Don't preload settings the user doesn't have yet.** A free-plan
  user doesn't see paid-only toggles.
- **Streaming is disclosure.** Render the parts you have; replace
  skeletons as data arrives. Don't block on the full payload.
- **Errors disclose details progressively**: short message first,
  technical detail behind `<details>` if it's actionable.
- **Forms can split** across steps if they have natural seams. Don't
  artificially fragment a one-screen task.

### Good
```tsx
// Sensible default; "Advanced" exposes RPE, tempo, etc.
<FormField label="Reps"><Input inputMode="numeric" /></FormField>
<FormField label="Weight"><Input inputMode="decimal" /></FormField>
<Disclosure label="Advanced">
  <FormField label="RPE"><Input inputMode="decimal" /></FormField>
  <FormField label="Tempo"><Input /></FormField>
</Disclosure>
```

### Bad
```tsx
// Every option exposed; the common case competes with the rare one.
<FormField label="Reps"><Input /></FormField>
<FormField label="Weight"><Input /></FormField>
<FormField label="RPE"><Input /></FormField>
<FormField label="Tempo"><Input /></FormField>
<FormField label="Rest seconds"><Input /></FormField>
<FormField label="Bar weight"><Input /></FormField>
<FormField label="Plate config"><Input /></FormField>
```

---

## 9. Visual restraint

### Definition
The default product surface is **calm**: neutral colors, quiet
typography, minimal motion. Saturated color, animation, and haptics are
**reserved** for moments that earn them.

### Why it matters
A screen that's loud everywhere is loud nowhere. If brand color
appears on every card, the brand has no signal value. If everything
animates, the user's eye habituates and stops seeing emphasis when it
finally matters.

### Practical rules
- **Accent color is for actions and links**, not for decoration. A
  whole card painted accent is almost always wrong.
- **`signal.pr` (gold) is reserved.** Use it only when the user
  actually achieved a personal record.
- **Motion follows `design-system/motion.md`.** Default is no motion.
  Animations are listed by name; don't invent new ones.
- **Shadows have a reason.** A card sits on `shadow-sm`; a modal sits
  on `shadow-lg` because it's above scrim. Don't shadow for "polish".
- **No more than one accent surface per screen.** Two accents compete
  and lose.
- **No ambient animation.** Pulsing, drifting, infinite loops are
  banned outside active loading indicators.

### Good
```tsx
// Calm dashboard: neutral surfaces, accent only on the primary action.
<main className="p-inset-lg bg-surface">
  <section className="grid grid-cols-1 gap-stack-md lg:grid-cols-3">
    <StatCard label="This week" value="24,160 kg" />
    <StatCard label="Streak" value="5" unit="days" />
    <StatCard label="Last PR" value="Squat 140kg" tone="pr" />
  </section>
  <Button className="mt-stack-xl">Start workout</Button>
</main>
```

### Bad
```tsx
// Brand color everywhere; PR token wasted on a non-PR moment.
<main className="p-inset-lg bg-accent">
  <Card className="bg-accent-hover text-onAccent">Today</Card>
  <Card className="bg-signal-pr text-onAccent animate-pulse">Streak</Card>
  <Button variant="ghost" className="animate-bounce">Start</Button>
</main>
```

---

## 10. Maintainability

### Definition
The system can be changed safely a year from now by people who weren't
in the room when it was built. Decisions are encoded in tokens, types,
tests, and docs — not in tribal memory.

### Why it matters
A design system is software. Software rots. The cost of inconsistent
patterns, undocumented tokens, and forked components compounds. Every
"quick fix" that bypasses the system is a debt that someone — often a
new joiner — will pay later.

### Practical rules
- **Tokens are the contract.** Add a token, don't hand-pick a value.
  Generate `tokens.css` and `tokens.ts` — never hand-edit.
- **Components have contracts**: TS types, named prop types, a docs
  file in `design-system/{components,patterns}/`, a Figma counterpart
  with matching variant names.
- **Changelog every change** under `[Unreleased]` in
  `design-system/changelog.md`. Token additions, component additions,
  contract changes, deprecations.
- **Deprecate before deleting.** Mark `@deprecated`, point to the
  replacement, ship one release with both, then delete.
- **CODEOWNERS exists for a reason.** Design-system files require
  DS-owner review. Don't merge around it.
- **Lint rules over review reminders.** If the same review comment
  appears three times, it should be a lint rule.
- **Generated files are reproducible.** `npm run tokens:check` in CI
  fails if anyone hand-edited an output.

### Good
```jsonc
// packages/ui/src/tokens/tokens.json
{
  "semantic": {
    "light": {
      "color": {
        "signal": {
          // Added for PR celebration moments (#9, #10).
          "pr": "{primitive.color.pr.500}"
        }
      }
    }
  }
}
// → npm run tokens:generate
// → entry added to design-system/changelog.md
// → used in code as `text-signal-pr` / `bg-signal-pr`
```

### Bad
```tsx
// One-off hex deep in feature code; no token, no docs, no traceability.
<span style={{ color: "#F59E0B" }}>PR</span>
```

---

## Putting it together

When reviewing or building a screen, walk these in order:

1. **Accessible?** (#3) — if no, stop and fix.
2. **Clear?** (#1) — what does a 2-second glance find?
3. **Convertible?** (#4) — can the user do the thing?
4. **Hierarchy?** (#7) — does the eye land in the right place?
5. **Restrained?** (#9) — what could be removed?
6. **Disclosed appropriately?** (#8) — is the default the common case?
7. **Responsive?** (#5) — verified at three viewports?
8. **Consistent?** (#2) — does this look like the rest of FAMM?
9. **Reused?** (#6) — could this be an existing component?
10. **Maintainable?** (#10) — token, contract, changelog?

If any answer is "no", the work isn't done.
