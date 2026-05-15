# Accordion

Status: 🟡 Planned. L1 primitive. Owned by the design-system owner.

Accordion is the only approved way to show **a list of disclosable
sections** — FAQs, settings groups, log-row details. For a single
collapsible region (one trigger, one panel), use `Disclosure` (planned).
For showing one of N peers, use `Tabs`.

Custom collapsible UIs (a `useState` boolean + a `<div>` with a height
transition) are a CI failure.

---

## 1. Purpose

A vertical stack of items, each with a trigger and a panel that can be
opened to reveal content. The component owns:

- The trigger row (label + chevron) with the WAI-ARIA disclosure
  pattern.
- The panel reveal animation, with reduced-motion fallback.
- The single-open vs multi-open contract.
- Keyboard navigation across items (`Up`/`Down`/`Home`/`End`).
- Item-level disable.

Use Accordion when sections are independent and the user may scan
several. Use `Tabs` when the user is comparing peer content and only
one should be visible at a time.

---

## 2. Variants

```
type:    single | multi   (single by default — only one panel open at a time)
variant: default | bordered | flush
size:    md (default) | sm
```

- `default` — each item is a card-like row with a hairline divider.
- `bordered` — full border around the accordion group.
- `flush` — no borders, used inside a Card.
- `single` accordions can also have `collapsible={true}` (default), so
  the user can close all items.

---

## 3. States

| State            | Trigger                                  |
|------------------|------------------------------------------|
| `collapsed`      | Panel is hidden                          |
| `expanded`       | Panel is visible                         |
| `hover`          | Pointer over trigger                     |
| `focus-visible`  | Keyboard focus on trigger                |
| `disabled`       | Item disabled                            |
| `transitioning`  | Mid-animation between collapsed / expanded |

Per-group states: `none-open`, `one-open`, `all-open`. These are
useful for analytics but not exposed in the API.

---

## 4. Usage rules

1. **Don't use Accordion to hide critical content.** Anything the user
   *needs* belongs out in the open. Accordion is for *optional* depth.
2. **3–10 items per group.** Below 3, use `Disclosure`. Above 10, the
   list itself is the problem — group or paginate.
3. **`single` by default.** `multi` is for settings groups where users
   genuinely want several open at once.
4. **No nested accordions.** Accordions inside accordions is an
   information-architecture smell. Restructure the content.
5. **Item titles are headings.** Each trigger is wrapped in a heading
   element (default `<h3>`); the consumer can override level via
   `headingLevel`.
6. **No `className` on triggers or panels.** Layout-only utilities on
   the wrapping container are allowed.
7. **Panels can contain anything except other Accordions.** Forms,
   text, tables — all fine, all rendered to the same width.
8. **Don't use Accordion as a navigation menu.** That's `Navigation`
   with a collapsible side rail.

---

## 5. Accessibility requirements

- **Pattern.** WAI-ARIA Disclosure (per item) + Accordion grouping.
- **Trigger.** A `<button>` inside a `<h3>` (or whatever heading level
  is appropriate). The button carries `aria-expanded` and
  `aria-controls` pointing at the panel.
- **Panel.** A `<div role="region" aria-labelledby="<triggerId>">`.
- **Keyboard.**
  - `Tab` moves into the first trigger.
  - `Enter` / `Space` toggles the focused item.
  - `Up`/`Down` move focus between triggers (within the group).
  - `Home`/`End` jump to first/last trigger.
- **Focus.** 2px ring on the trigger button. The chevron is decorative
  (`aria-hidden`).
- **Disabled item.** `aria-disabled="true"`; arrow nav skips it.
- **Motion.** Reveal uses `motion.role.enter` with a height transition;
  collapses to instant under `prefers-reduced-motion`.
- **Heading hierarchy.** Triggers must use a heading level that fits
  the page's existing outline. Don't render all triggers as `<h2>` on a
  page that already has `<h1>` and `<h2>` siblings.
- **Color independence.** Open vs closed is conveyed by the chevron
  rotation (or icon swap) in addition to any tint change.

---

## 6. Responsive behavior

- **`<sm`.** Accordion fills the container width. Trigger padding
  inherits `space.inset.md`; the chevron stays right-aligned and
  44×44 touch-target compliant.
- **`≥md`.** Same shape, same widths. Accordions sit inside their
  container; they do not constrain width.
- **Long titles** wrap to two lines; the chevron stays vertically
  centered.

---

## 7. Content rules

- **Trigger title.** Sentence case, 1–8 words. Phrased as a question for
  FAQs ("How do I cancel my plan?"), as a noun for settings ("Email
  preferences").
- **Panel content.** Concise. Average 1–3 short paragraphs or a small
  form. If a panel grows past a screen, it's a route, not a panel.
- **No "Click here to expand."** The chevron is the affordance.
- **No emoji in triggers.**
- **Don't restate the title** as the first sentence of the panel.

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Accordion } from "@famm/ui";`
   — compound API with `Accordion.Item`, `Accordion.Trigger`,
   `Accordion.Panel`.
2. **Never build a custom collapsible** with `useState` + height
   transitions in product code.
3. **Pick `single` vs `multi` by intent.** FAQs are usually `single`.
   Settings groups are usually `multi`.
4. **Each item has a stable `value`** so the open state can be
   controlled (`value` + `onValueChange`).
5. **Wrap triggers in the right heading level.** The default `<h3>`
   suits most pages; if the page's outline is different, pass
   `headingLevel`.
6. **Don't put critical content inside an Accordion.** If users need
   it, surface it.
7. **No nested accordions.** Restructure the content.
8. **No `className` on the trigger or panel.** Layout-only utilities
   on the wrapper are fine.
9. **For a single one-off collapsible**, use `Disclosure`, not
   Accordion-of-one.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Accordion
Component set name:  Accordion
Variant axes:
  type:     single | multi
  variant:  default | bordered | flush
  size:     md | sm
Sub-frames:
  Accordion / Item        (collapsed | expanded | hover | focus | disabled)
  Accordion / Group       (3-item example with one expanded)
  Accordion / InCard      (flush variant inside a Card)
```

Tokens used (semantic only): `color.surface.default`,
`color.surface.raised` (bordered), `color.text.primary`,
`color.text.secondary` (panel body), `color.border.subtle` (dividers),
`color.border.focus`, `radius.card` (bordered group), `space.inset.md`,
`space.stack.sm`, `motion.role.enter`, `motion.role.exit`.

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/accordion.tsx
Exports:  Accordion, AccordionProps   (Accordion.Item, Accordion.Trigger, Accordion.Panel)
Import:   import { Accordion } from "@famm/ui";
Tier:     L1 primitive
```

File name `accordion.tsx`. `Disclosure` (single trigger + single
panel) is a separate primitive when shipped. There is no `Collapse`,
`Expander`, `FAQ`, or `Foldout` component anywhere else in the
monorepo.
