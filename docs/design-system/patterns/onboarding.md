# Onboarding

Status: Pattern documentation. Applies to the first-run flow at
`apps/web/src/app/(auth)/onboarding/` and to any in-product "first
time setup" flow (e.g. configuring a new trainer profile).

Onboarding is a structured wizard whose job is to collect the minimum
information needed to make the product useful, then get out of the
way. The pattern enforces one-thing-per-screen, clear progress, and
the ability to skip non-essential steps.

There is one canonical wizard shape — feature areas reuse it via the
`Wizard` L2 pattern.

---

## 1. Purpose

Move a new user from "I signed up" to "I'm doing something useful"
without overwhelming them. Collect only what's needed to personalise
the first session; defer the rest to settings.

The pattern owns:

- The step indicator (where am I, how many to go).
- The single-question-per-screen rhythm.
- Forward / back / skip controls.
- Validation per step before allowing forward.
- Auto-save: every answered step persists immediately.
- The exit affordance (close → "Are you sure?" → confirm).

---

## 2. Recommended layout

The wizard occupies its own surface. No product chrome (no
Navigation). Per step:

1. **Top bar.** Logo (left), progress indicator (centre), close
   icon-button (right). Sticky.
2. **Step body.** One question. Heading + sub-heading + the input
   (Input, Select, Radio group, or a custom L3 selector). Centred
   vertically on `≥md`; top-aligned on `<sm`.
3. **Footer.** Sticky on `<sm`. Primary `Button` ("Continue") on the
   right; `Skip` ghost button (when allowed) on the left; `Back`
   icon-button before `Skip`.

Canonical FAMM steps (in order): goal → experience → schedule →
equipment → first-plan suggestion → ready-to-go confirmation.

---

## 3. Required components

All from `@famm/ui`:

- A `Wizard` L2 pattern (`apps/web/src/components/onboarding/wizard.tsx`)
  composing `Card`, `Button`, the step indicator, and the
  forward/back/skip wiring.
- `Input`, `Select`, `Radio` (`type="card"`), `Checkbox` — one
  control per step.
- `Button` — primary, ghost, and `IconButton` for back/close.
- `Modal` — for the exit confirmation.
- `Toast` (`toast.success("Saved.")`) on auto-save where appropriate.
- `Badge` — for marking recommended options inside a Radio group.
- `Skeleton` / `Spinner` — for transitions that fetch data (e.g. the
  first-plan suggestion step).

---

## 4. Content hierarchy

- **H1 per step.** The question itself. "What's your goal?", "How
  often can you train?" — short, direct, no preamble.
- **H2** *not used* inside a wizard step — one question per screen
  means one heading.
- **Body** for sub-headings and supporting copy under the H1. ≤ 1
  sentence.
- **Button labels.** Primary is "Continue" everywhere except the
  final step ("Start training"). Ghost is "Skip" or "Skip for now".

Copy rules:

- Questions are *first-person from the user's perspective*: "What's
  your goal?" not "Select your goal."
- No fluff. "Tell us a bit about yourself" is filler — replace with
  the actual question.
- Translate "loading" copy: "Building your first plan…" beats
  "Loading…".

---

## 5. Responsive behavior

| Breakpoint | Shape                                                       |
|------------|-------------------------------------------------------------|
| `<sm`      | Top bar + scrollable body + sticky footer with full-width Continue button. |
| `sm`–`md`  | Same as `<sm` but body centred horizontally with `max-w` ~ 480px. |
| `md`–`lg`  | Body card centred on the viewport; footer inside the card.   |
| `≥lg`      | Same as `md`, with a wider card (`max-w` ~ 560px).           |

The progress indicator is a single line of small dots / segments,
never a percentage number. Long step labels are hidden on `<sm`.

---

## 6. Accessibility requirements

- **Document language.** `<html lang>` is set; onboarding respects the
  user's locale picked at signup.
- **One H1 per step.** Step changes update the document title via
  Next.js metadata so screen readers announce the new step.
- **Progress.** The step indicator has `role="progressbar"` with
  `aria-valuenow` / `aria-valuemax` / `aria-valuetext` (e.g. "Step 2
  of 6: Experience").
- **Focus management.** On step change, focus moves to the new step's
  H1 (not to the first input — that would skip the question itself).
- **Keyboard.** `Enter` inside an input advances (when valid).
  `Esc` opens the exit confirmation.
- **Forms.** Every input has a label; errors live on the field, not in
  a toast.
- **Save state.** "Saving…" announces via `aria-live="polite"`.
- **Reduced motion.** Step transitions collapse from slide to fade.
- **Touch targets.** All controls 44×44 minimum.
- **Skip option.** A user must always be able to skip non-essential
  steps — never block forward progress.

---

## 7. Conversion considerations

Onboarding's conversion metric is **activation** (the user completes
the first useful action — log a set, book a session). Optimise:

- **Fewer questions, fewer drop-offs.** Every question must justify
  its existence. If you don't use the answer in the first 24 hours,
  it's a settings field, not an onboarding step.
- **Skip is a feature.** Allow it on every step that isn't strictly
  required. Track skip rate per step — high skip rates mean the
  question is wrong.
- **Defaults that work.** If most users pick option B, B is the
  pre-selected default — don't make everyone re-select.
- **Auto-save means resumable.** A user who closes the tab can return
  to the same step. The DB stores per-step state, not a giant blob at
  the end.
- **Single-page wizards lose on mobile.** Keep one-question-per-screen
  on every viewport.
- **Time-to-first-success ≤ 90s** for the median new user. Measure it.
- **No upsells during onboarding.** Pricing is a separate flow.

---

## 8. Common mistakes

- Multi-question screens ("Tell us about yourself: name, age, height,
  weight, goal, …") — drop-off explodes.
- Progress bars that lie. If there are six steps, the indicator shows
  six segments. Don't render a 40% bar from invented progress data.
- Asking for data that won't be used. Phone number for a web product?
  Skip.
- Modal-based onboarding inside the product. Use a dedicated route so
  users can refresh, share, and resume.
- No way to exit. The close icon is mandatory; exit confirms via
  Modal.
- Submitting the whole wizard at the end. Auto-save every step.
- Custom step-indicator component every team builds from scratch. Use
  the `Wizard` L2 component.
- Onboarding that crashes when a step fails. Treat each step as
  resilient: errors live on the field, never reset the wizard.

---

## 9. AI implementation instructions

1. **Route.** `apps/web/src/app/(auth)/onboarding/[step]/page.tsx` with
   the step number in the URL — never wizard state in memory only.
2. **Use the `Wizard` L2 pattern.** Don't roll your own.
3. **One question per step.** If a step has two questions, split it.
4. **Auto-save on every step.** A `nextStep()` server action saves the
   current answer and routes forward.
5. **Validation lives on the input.** Pass `error` to the Input /
   Select / Radio. Don't surface a toast.
6. **Skip when allowed.** Pass `canSkip={true}` on optional steps; the
   wizard renders the ghost "Skip" button.
7. **Focus management.** On step change, the wizard moves focus to
   the H1 — don't manually focus inputs.
8. **Step indicator.** `<Wizard.Progress steps={N} current={i} />` —
   don't compute percentages or write a custom bar.
9. **Exit confirmation.** Close icon opens a `Modal` (`size="sm"`,
   `tone="destructive"` only if data would be lost). Don't dump the
   user out without confirming.
10. **Analytics.** Each step fires `onboarding_step_view` with the
    step name; completion fires `onboarding_completed`. Drop-offs are
    measured as gaps between consecutive `_view` events.
11. **No marketing copy.** The user is in; sell them the product by
    making the product good, not by overlaying praise.
