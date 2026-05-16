# Badge

Status: 🟢 Stable. L1 primitive. Owned by the design-system owner.

Badge is the only approved way to surface short, non-interactive status
or metadata next to other content: a tag on a workout ("PR"), a status
on a booking ("Confirmed"), a count on a tab ("3"). Hand-rolled
"little pill with a colored background" elements are a review failure.

Badges look like buttons. They are not. If a label needs to be clicked,
it is a `Button`, a `ToggleButton`, or a `Chip` (planned) — never a
Badge.

---

## 1. Purpose

A compact, inline label that communicates a status, category, or count.
The component encapsulates:

- The pill shape (`radius.pill`) and the tight `space.inset.xs` padding.
- The seven semantic tones for the FAMM signal language.
- Contrast-validated foreground/background pairings.
- A focus ring for keyboard users (Badge is focusable when it carries
  meaningful state, even though it is not interactive).

If you can't say what the Badge *means* in one word, it shouldn't be on
the screen.

---

## 2. Variants

Variants encode meaning. Pick the variant by intent, not by color.

| Variant       | Use for                                                 |
|---------------|---------------------------------------------------------|
| `default`     | Brand-emphasis label ("New", "Beta")                    |
| `secondary`   | Neutral metadata ("Draft", "Free tier")                 |
| `outline`     | Quiet metadata on a busy surface                        |
| `success`     | Positive state ("Confirmed", "Completed")               |
| `warning`     | Caution state ("Expiring soon")                         |
| `destructive` | Negative state ("Failed", "Cancelled")                  |
| `pr`          | Personal record celebration — reserved, used sparingly  |

Rules:

- `pr` is an earned moment (per principle #2 in `DESIGN_SYSTEM.md §2`).
  Use it for genuine personal records; do not use it for "highlight."
- Don't mix tones on the same Card to color-code multiple categories.
  Two variants per surface is the soft ceiling.
- A Badge variant is not a button color — never use `default`
  red-on-white to "match the dangerous-looking button."

To add a variant: extend `badgeVariants` in
`packages/ui/src/components/primitives/badge.tsx`. Do not introduce a
parallel component.

---

## 3. States

Badge is non-interactive. States exist for completeness:

| State    | Trigger                                       |
|----------|-----------------------------------------------|
| `default`| Idle                                          |
| `focus`  | Receives keyboard focus when made focusable for screen readers (rare) |

There is no `hover`, no `active`, no `disabled`. If you want any of
those, you want a `Button` or a `Chip`.

---

## 4. Usage rules

1. **Badges are nouns or short noun phrases.** "PR", "Confirmed", "+3".
   No verbs.
2. **Never wrap a Badge in a Button.** If the user is supposed to click
   the label, it's a different component.
3. **One Badge per concept.** Don't stack three Badges to communicate
   "new, free, beta" — pick the most important one.
4. **No color overrides.** Variant is the only way to change tone. A
   `Badge className="bg-pink-500"` is a CI failure.
5. **No padding overrides.** The size is fixed. If you need a bigger
   chip, that's a different primitive.
6. **Don't put icons inside Badges by default.** A Badge is a word.
   Future: an `iconOnly` variant may exist for status dots; until then,
   keep them text-only.
7. **Counts use `default` or `secondary`.** "3" on a tab is `secondary`;
   "1" on an unread inbox is `default`.

---

## 5. Accessibility requirements

- **Semantics.** Rendered as a `<div>` by default. It carries no role —
  it's decorative text in a styled container.
- **Accessible name.** The visible text **is** the name. For a Badge
  inside a more complex control (e.g. on a tab), the parent provides
  context; the Badge text is announced as part of the parent.
- **Status semantics.** When a Badge represents a *changing* status
  (e.g. order status updates live), wrap it in a parent with
  `role="status"` and `aria-live="polite"`. The Badge itself doesn't
  announce.
- **Contrast.** All seven variants are pre-validated. Text on tinted
  backgrounds (the `/10` and `/15` opacities for danger / success /
  warning / pr) meets AA against the parent surface. If you embed a
  Badge on an inverse surface, validate manually.
- **Focus.** Don't make a Badge focusable. If it needs focus, it's a
  Button.
- **Color independence.** Status meaning must not rely on color alone.
  "Failed" appears in `destructive` variant **and** says "Failed".
  Never communicate state with a colored Badge that has no text.

---

## 6. Responsive behavior

Badge is inline and content-width. It does not respond to breakpoints.

What designers should watch at small viewports:

- Long Badge labels truncate the surrounding content, not themselves —
  Badge does not have a max-width. If a Badge wraps, the label is too
  long for the format; shorten it.
- Stacking many Badges on one line on `<sm` overflows. Use a `Stack`
  with `wrap` or hide secondary Badges below `md`.

---

## 7. Content rules

- **1–2 words.** "Confirmed", "On hold", "Free trial". "Currently
  awaiting confirmation" is body text, not a Badge.
- **Sentence case** for words, **uppercase** is reserved for
  abbreviations and the `pr` variant ("PR").
- **No trailing punctuation.** No "!", no ".", no "…".
- **Numbers as counts** are bare digits: "3", "+12", "99+". Cap at
  "99+" for unread/notification counts; the exact number above 99 is
  not useful.
- **No emoji.** Use the variant for tone.
- **Translation.** Plan for ~50% width growth. "Confirmed" → "Bestätigt"
  → "Подтверждено". Container layout must not overflow.

---

## 8. AI implementation instructions

1. **Import.** `import { Badge } from "@famm/ui";`.
2. **Pick variant by meaning, not color.** Success outcomes →
   `variant="success"`. Errors → `variant="destructive"`. Personal
   record → `variant="pr"` (sparingly).
3. **Never write a "pill" with utilities.** `<span className="rounded-full
   bg-green-100 ...">Confirmed</span>` is banned. Use `Badge`.
4. **No `className` for visuals.** Layout-only utilities
   (`className="ml-inline-xs"`) are allowed for spacing relative to a
   sibling.
5. **Don't make a Badge clickable.** Reach for `Button variant="ghost"`
   or wait for `Chip`.
6. **Pair Badge with text in the same statement, not as a replacement.**
   "Workout completed" + `<Badge variant="success">+1 streak</Badge>`,
   not just a green badge with no surrounding context.
7. **Counts.** Pass the number as a string child:
   `<Badge variant="secondary">{count > 99 ? "99+" : count}</Badge>`.
8. **Live updating status.** Wrap a `<span role="status" aria-live="polite">`
   around the Badge — the Badge itself doesn't announce.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Badge
Component set name:  Badge
Variant axis:
  variant: default | secondary | outline | success | warning | destructive | pr
```

The component thumbnail shows `default`. Each variant is its own frame
in the section, with the example word and the rule for when to reach
for it. Tokens used (semantic only): `color.action.primary` +
`color.text.on-accent` (default), `color.surface.sunken` +
`color.text.primary` (secondary), `color.border.default` +
`color.text.secondary` (outline), `color.signal.success`,
`color.signal.warning`, `color.signal.danger`, `color.signal.pr`,
`radius.pill`, `space.inset.xs`, `font.role.label`.

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/badge.tsx
Exports:  Badge, badgeVariants, BadgeProps
Import:   import { Badge } from "@famm/ui";
Tier:     L1 primitive
```

File name is lowercase-kebab (`badge.tsx`). `badgeVariants` is exported
so L2 patterns can compose styles when they intrinsically include a
badge (e.g. `StatCard` showing a "PR" badge), but no other component
in the monorepo defines its own "badge" shape. There is no
`StatusPill`, `Tag`, or `Chip` today — when those arrive, they will be
distinct primitives with distinct purposes.
