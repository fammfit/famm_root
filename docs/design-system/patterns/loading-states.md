# Loading states

Status: Pattern documentation. Applies to every surface that fetches,
mutates, or computes. Covers initial loads, in-place updates, and
optimistic UI.

A spinner is a small admission of "I couldn't pre-render this." The
pattern's job is to make loads feel fast, predictable, and never
catastrophic.

There are four loading patterns, picked by *what's loading and how
much we know about it.* Pick deliberately.

---

## 1. Purpose

Communicate "we're working on it" without hiding the structure of
the screen or losing the user's place. The pattern owns:

- The skeleton component for layout-shaped placeholders.
- The spinner component for atomic operations.
- The progress bar for deterministic long operations.
- The optimistic-update contract for actions that almost always
  succeed.

Decision tree:

- Do we know the layout? → **Skeleton.**
- Atomic operation < 2s, atomic origin (button, field)? → **Spinner**
  inline on the trigger.
- Deterministic progress (upload, batch)? → **Progress bar.**
- Action almost always succeeds (toggle, like, save)? → **Optimistic
  UI** + Toast on failure.

---

## 2. Recommended layout

**Skeleton.** Replace each content node with a token-tinted placeholder
of the same shape. Cards become a Card outline with placeholder
title + 3 placeholder body lines. Stat cards keep the stat-card
shape. Tables keep their column widths. Use the `Skeleton` primitive
to compose.

**Spinner.** Inline. `Button loading={isPending}` wraps the spinner
inside the button. For a Card whose body is loading, replace the
body with a single small `Spinner` + a label ("Loading workouts…").

**Progress bar.** Top of the surface, or anchored to the trigger.
Always show the percentage in text alongside (color independence).

**Optimistic UI.** Render the assumed-success state immediately;
roll back on failure with a Toast.

---

## 3. Required components

- `Skeleton` (L1 primitive when shipped at
  `packages/ui/src/components/primitives/skeleton.tsx`).
- `Spinner` (L1, already shipped at
  `packages/ui/src/components/primitives/spinner.tsx`).
- `ProgressBar` (L1 when shipped).
- `Button` — with `loading={isPending}` for atomic actions.
- `Toast` — for optimistic rollback notifications.

Composition rules:

- Skeletons compose into the surface's own shape — a Skeleton
  StatCard, a Skeleton Table row. Don't render a generic grey block.
- Spinners never appear without a label inside Cards larger than
  ~ 200px.
- Progress bars need both a numeric label and a visible bar.

---

## 4. Content hierarchy

- **Loading text** (when present) is `font.role.body`, neutral tint.
  "Loading your week…", not "Please wait."
- **Progress label** is the percentage, e.g. "32%". Always paired with
  the active operation name: "Uploading photo — 32%".
- **Skeleton blocks** have no text. They're the shape, not the copy.

Copy rules:

- Loading copy is specific. "Loading workouts…" beats "Loading…".
- Don't say "Please wait." It implies waiting; what you mean is "I'm
  working on it."
- Don't show ETAs unless they're accurate within ±20%.

---

## 5. Responsive behavior

Skeletons match the responsive shape of the content they replace.
Dashboard stats stack 2-per-row → skeletons stack 2-per-row. Table
on `≥md` → skeleton table rows; Table-as-cards on `<md` → skeleton
cards.

Spinners stay the same size at every breakpoint (`h-4 w-4` inside
buttons, `h-6 w-6` for Card-level loaders).

Progress bars stretch to the container width; the label sits to the
right on `≥sm`, below on `<sm`.

---

## 6. Accessibility requirements

- **`aria-busy`.** The wrapping region carries `aria-busy="true"`
  while loading; flips to `false` when loaded. Screen readers
  announce "busy" / "not busy".
- **`role="status"`** on the loading region (for `Skeleton` blocks
  inside content panes). The status text ("Loading workouts…") is
  announced politely.
- **Spinners.** The `Spinner` primitive carries `role="status"` and a
  visually-hidden label by default ("Loading"). Inside Buttons, the
  Button's `aria-busy` is what matters; the spinner is
  `aria-hidden`.
- **Progress bars.** `role="progressbar"` with `aria-valuenow`,
  `aria-valuemin`, `aria-valuemax`, `aria-valuetext`.
- **Reduced motion.** Skeleton shimmer, spinner rotation, and
  progress bar movement collapse to a static state under
  `prefers-reduced-motion`. The `aria-busy` semantics remain.
- **Don't hijack focus** during loading. Focus stays on the trigger
  or the previously focused element.
- **Don't block input.** Disable only what's specifically dependent
  on the in-flight operation. The rest of the page remains
  interactive.

---

## 7. Conversion considerations

Loading is a tax on attention; minimise it.

- **Pre-render** above-the-fold data via Server Components.
- **Skeleton the layout you know.** The user can read the structure
  while data loads — that's much better than a spinner.
- **Optimistic UI for routine actions.** Like / save / toggle should
  feel instant.
- **Stagger long loads** instead of holding everything: each card
  loads independently with its own skeleton.
- **The 200ms / 1s / 10s thresholds.** Under 200ms feels instant;
  show no spinner. Under 1s shows a spinner; over 1s benefits from a
  skeleton; over 10s needs a progress bar.
- **First contentful paint < 1.5s** on a Moto G class device on 4G.
  Measure.
- **Don't render a spinner over the whole app.** A page shell with
  a spinner where data should be is worse than a skeleton.

---

## 8. Common mistakes

- A full-page spinner on every route change.
- Skeletons that don't match the rendered shape — content jumps when
  data lands.
- Spinners with no label inside large Cards.
- Loading state that disables every control on the page.
- Auto-refresh that resets the user's scroll / focus.
- A progress bar that fakes progress (animated regardless of actual
  state).
- Forgetting `aria-busy`. Screen readers think nothing's happening.
- Optimistic UI without rollback. A "saved" state that silently
  reverts on failure is a trust killer.
- Multiple competing spinners on the same screen. One per region,
  max.
- Loading copy as marketing ("Almost ready…", "Just a sec!"). State
  what's actually loading.

---

## 9. AI implementation instructions

1. **Imports.**
   ```tsx
   import { Skeleton, Spinner, ProgressBar } from "@famm/ui";
   ```
2. **Pick by signal:**
   - Known layout, fetching data → `Skeleton` shaped like the
     content.
   - Atomic action triggered by a button → `Button loading={isPending}`.
   - Long deterministic operation → `ProgressBar` with a label.
   - Likely-success action → optimistic update + Toast on rollback.
3. **Server-render what you can.** Don't reach for a Skeleton when a
   Server Component could resolve the data first.
4. **Skeletons match the shape.** Compose
   `Skeleton.Card`/`Skeleton.Row`/`Skeleton.StatCard` so the layout
   doesn't jump when data lands. Don't render a generic grey block.
5. **`aria-busy`** on the wrapping region; the Skeleton component
   handles this for you. If you're rolling your own, set it.
6. **One spinner per region.** Don't stack two on the same surface.
7. **Don't disable the page during a single-region load.** Only the
   affected control or region.
8. **Optimistic UI** is a React `useOptimistic` + a Server Action
   that returns either the canonical state or an error. On error,
   roll back and `toast.error("Couldn't save…")`.
9. **Don't fake progress.** Use spinners for indeterminate
   operations. A progress bar that goes 0 → 90% and stalls is worse
   than a spinner.
10. **Loading copy is specific.** "Loading workouts…" not
    "Loading…".
11. **Reduced motion.** The component's animation gates on
    `useReducedMotion()` — don't add a media query yourself.
12. **Don't preload data the user didn't ask for** to "warm" caches
    in a way that breaks loading semantics. Prefetch on hover /
    focus, not on mount.
