# Card

Status: 🟢 Stable. L1 primitive. Owned by the design-system owner.

The Card is the only approved way to group related content onto a raised
surface. It exists so that "things that belong together" look the same
everywhere — stat blocks, list items in feeds, summary panels, payment
receipts. Raw `<div className="rounded shadow ...">` in `apps/web` is a
review failure.

Card is a **compound component**. The shell is `Card`; structural slots
are `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and
`CardFooter`. Compose, don't override.

---

## 1. Purpose

A bounded surface that lifts a coherent piece of content above the page,
defines its padding, and gives it a consistent border, radius, and
elevation. Cards group; they don't decorate.

The component encapsulates:

- The page-vs-raised contrast (token `color.surface.raised`).
- The `radius.card` corner radius and `elevation.raised` shadow.
- The internal padding rhythm (`space.inset.lg` per slot).
- The hairline border in light mode and the inner-light treatment in
  dark mode.

If a screen has more than one Card style, one of them is wrong.

---

## 2. Variants

There is currently **one** visual variant — the default elevated surface.
The compound API is the variation surface: combine slots, don't combine
visual styles.

```
Variant: default   (elevated raised surface, hairline border)
```

Reserved for future addition (not yet shipped):

- `interactive` — when the entire card is a single action target (wraps
  in `<button>` / `<a>`, adds hover lift + focus ring).
- `flat` — for nested cards on already-raised surfaces.
- `inline` — when a "card" lives inside a list and inherits the parent's
  surface.

To add a variant: convert `Card` to `cva()` in
`packages/ui/src/components/primitives/card.tsx` and document here. Do
not introduce a sibling component.

---

## 3. States

Card itself is non-interactive. Slots inherit state from their content.

| State          | Trigger                                              |
|----------------|------------------------------------------------------|
| `default`      | Idle                                                 |
| `focus-within` | Any descendant has focus — used to subtly highlight  |
| `disabled`     | When the Card represents a disabled item (consumer applies `aria-disabled` and dims via opacity token; do not gray out) |

There is no `hover` state on the default variant — hover affordances
belong on the interactive child (a Button, a Link). Adding a global
hover lift requires the future `interactive` variant.

---

## 4. Usage rules

1. **Always use the compound API.** Header / Title / Description /
   Content / Footer in that order. Skip slots you don't need; never
   reorder.
2. **One title per Card.** `CardTitle` renders an `<h3>`. If the
   surrounding document already uses `<h3>`, override level via the
   `as` prop (when shipped) — heading hierarchy matters more than
   visual size.
3. **No raw padding overrides.** Each slot owns its padding via
   `space.inset.lg`. Adding `p-*` at the call site is a smell — the
   layout is wrong, not the padding.
4. **Cards don't nest themselves.** A Card inside a Card creates double
   borders and double padding. Use a `Stack` or a divider instead.
5. **No background overrides.** The surface is `color.surface.raised`.
   For an inverse / accent surface, propose a variant.
6. **Cards don't carry actions in their chrome.** Buttons live inside
   `CardFooter` or `CardContent`. A "more options" menu trigger sits in
   `CardHeader` next to the title; nothing else.
7. **Width.** Cards are 100% of their container. Width comes from the
   grid, not from the Card.

---

## 5. Accessibility requirements

- **Semantics.** The shell is a `<div>` by default — Cards do not imply
  a region. For a card that genuinely is a landmark (e.g. a feed item
  with multiple sub-actions), render as `<article>` via the `as` prop
  (when shipped) or wrap externally.
- **Heading.** `CardTitle` is `<h3>`. It must come before
  `CardDescription` and `CardContent` in DOM order so screen readers
  announce the hierarchy correctly.
- **Focus-within.** Cards expose a `focus-within` style; do not remove
  it. It's the only visible cue that a control inside an unbordered
  card has focus on touch viewports.
- **Decorative borders only.** The border carries no semantic meaning.
  Don't rely on the border to communicate selection — use `Badge` or
  `aria-pressed` on a child control.
- **Contrast.** `color.text.primary` on `color.surface.raised` is
  pre-validated ≥ 7:1 in both modes. If you override colors, you own
  the contrast.

---

## 6. Responsive behavior

Card is breakpoint-agnostic. Padding and radius are constant across `sm`
/ `md` / `lg` / `xl`. The container governs:

- On `<sm`, cards typically span full width with a small page inset.
- On `≥md`, cards live inside a grid (`grid-cols-{2,3}` in feeds).
- On `≥lg`, longer cards may be paired side-by-side; Card itself does
  not change.

What does change at small viewports:

- A `CardFooter` with multiple actions should stack vertically below
  `sm` — the consumer wraps the actions in a `Stack` and switches axis.
- Long titles wrap; do not truncate `CardTitle` by default.

---

## 7. Content rules

- **Title.** Sentence case, ≤ 60 characters, no trailing punctuation.
  Nouns or noun phrases: "Today's workout", not "Today's workout!"
- **Description.** ≤ 2 lines at the default width. If you need more,
  it's body content, not a description.
- **Body.** Whatever the slot calls for, composed of other primitives.
- **No raw text directly in `Card`.** Text lives in slots. A naked
  string child renders without padding and is a review smell.
- **Empty states.** Don't render a Card around "nothing yet" placeholder
  copy. Use an `EmptyState` pattern (when shipped).

---

## 8. AI implementation instructions

1. **Import is fixed.**
   ```tsx
   import {
     Card, CardHeader, CardTitle, CardDescription,
     CardContent, CardFooter,
   } from "@famm/ui";
   ```
2. **Never write `<div className="rounded-card ...">`.** If you find
   yourself drawing a card shape with utilities, stop and use the
   primitive.
3. **No `className` for visuals.** The only legitimate overrides on
   Card are layout-only (`className="col-span-2"`,
   `className="md:grid-cols-2"`). Color, padding, radius, and shadow
   come from the component.
4. **Order matters.** `CardHeader` → `CardContent` → `CardFooter`.
   `CardTitle` and `CardDescription` go inside `CardHeader`.
5. **One title per Card.** No second `<h3>` inside `CardContent`.
6. **Interactive cards.** Don't wrap the whole Card in a Button. Wrap
   the title (or the entire `<article>`) in a `Link`, or wait for the
   `interactive` variant.
7. **Don't use Card as a tooltip, popover, or modal surface.** Those
   have their own primitives.
8. **Compose with `Stack`** for vertical rhythm inside `CardContent`.
   Don't add `space-y-*` directly.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Card
Component set name:  Card
Variant axes:
  variant: default                       (interactive | flat | inline reserved)
  state:   default | focus-within
Slot frames (inside the section): Card / Header, Card / Title,
                                  Card / Description, Card / Content,
                                  Card / Footer
```

Slot frames are documented separately so designers can drag in the
header/footer they need without instantiating the whole shell. Tokens
used (semantic only): `color.surface.raised`, `color.border.subtle`,
`color.text.primary`, `color.text.muted`, `radius.card`,
`elevation.raised`, `space.inset.lg`, `space.stack.xs`.

---

## 10. Code component naming convention

```
Source:     packages/ui/src/components/primitives/card.tsx
Exports:    Card, CardHeader, CardTitle, CardDescription,
            CardContent, CardFooter
Import:     import { Card, CardHeader, ... } from "@famm/ui";
Tier:       L1 primitive
```

File name is lowercase-kebab (`card.tsx`) matching the rest of
`primitives/`. Display names match the export name. No alternative
"CardV2", "FancyCard", or feature-prefixed exports anywhere in the
monorepo.
