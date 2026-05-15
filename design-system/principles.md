# Design Principles

Five principles, in priority order. When two of them conflict, the higher one
wins. These are the tie-breakers — when a designer and an engineer disagree on
a detail, point at the highest principle that applies and decide from there.

---

## 1. Clarity over cleverness

A user mid-workout has roughly two seconds of attention. Numbers, the next
action, and current state must be the loudest things on the screen.

**Apply this when**
- Choosing typography weights and sizes on metric screens.
- Deciding whether an icon needs a text label (default: yes).
- Picking between two layouts where one is "elegant" and one is "obvious".

**Concrete consequences**
- Stat values use `text-3xl font-semibold tabular-nums` minimum.
- Primary action of a screen is visible without scrolling on the smallest
  supported viewport.
- Avoid icon-only buttons in the workout flow.

---

## 2. Calm by default, energetic on signal

Neutral surfaces and quiet typography are the baseline. Saturated accent
color, motion, and haptics are *reserved* for moments that earn them.

**Earned moments include**
- Hitting a personal record (`signal.pr` color, animation allowed).
- Completing a session (one-time celebration).
- Finishing a streak milestone.
- Critical alerts (`signal.danger`, no animation, just contrast).

**Anti-patterns**
- Brand color on every card.
- Hover animations on non-interactive elements.
- Drop shadows for "depth" without a layering reason.

---

## 3. One way to do a thing

If a `Button`, `Card`, or `StatCard` exists, you use it. Variants extend the
canonical component — they don't fork it.

**Apply this when**
- You're tempted to add `MyFeatureButton.tsx`. Don't. Use the variant prop, or
  open a PR to add a variant to `Button`.
- Two designers have drawn the same UI twice in different files.
- An engineer copies a CSS rule from one component into another.

**Concrete consequences**
- The component review asks: "could this be a variant of X instead?".
- The DS owner can reject a new component by pointing to an existing one.

---

## 4. Accessible by construction

Contrast, focus, motion-reduction, and target sizes are properties of the
component, not the caller. If a primitive accidentally lets you make it
inaccessible, the primitive is wrong.

**Apply this when**
- Reviewing a new primitive — does its smallest size meet 44×44 on touch?
- Writing a form control — is the `<label>` enforced by the component?
- Adding animation — does it branch on `useReducedMotion()`?

See `accessibility.md` for the binding rules.

---

## 5. Token-driven, not value-driven

No raw hex, `px`, `rgb()`, or `ms` in feature code. If a token doesn't exist
for what you need, add one (`tokens.json`) — don't bypass.

**Apply this when**
- ESLint flags a literal in your PR. Don't silence the rule — add the token.
- A designer hands over a spec with one new color. Add it to tokens before
  you add it to a component.
- You're tempted to use `style={{ ... }}`. The rule against it exists for
  this principle.

**Allowed exceptions**
- L1 primitives may use raw Tailwind utilities (still no hex/px) so they can
  anchor the rest of the system on tokens.

---

## How to use these in review

When approving or rejecting a PR, prefer to cite a principle over a personal
preference. "This violates principle 2 — the streak banner shouldn't pulse
unless you've actually hit a streak" is a stronger comment than "I don't like
the animation".
