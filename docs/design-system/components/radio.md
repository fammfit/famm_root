# Radio

Status: 🟡 Planned. L1 primitive. Owned by the design-system owner.

Radio is the only approved way to let a user choose **one** option from
a small, mutually exclusive set (2–5). Above 5 options, use `Select`.
Above 7 with parallel labels, use a `SegmentedControl` (planned).

Raw `<input type="radio">` is banned outside L1.

---

## 1. Purpose

A grouped one-of-many control with a circular indicator, an accessible
fieldset, and the same focus / error contract as Checkbox. The
component owns:

- The 18×18 circle with the filled inner dot for the selected option.
- The keyboard-driven group navigation (arrow keys move selection).
- The fieldset/legend wiring for screen readers.
- Group-level error rendering.

Use Radio when **exactly one** option must be chosen and seeing all
options at once helps the user decide.

---

## 2. Variants

```
size:     md (default) | sm
layout:   vertical (default) | horizontal | card
```

- `card` renders each option as a selectable card with optional
  description text. Use when options carry meaningful detail (pricing
  plans, workout difficulty). The radio dot lives in the top-right
  corner of the card.
- `horizontal` lays options on one row — only legal when each label is
  one or two words.

Reserved: a `segmented` variant. Until shipped, use a separate
`SegmentedControl` (planned).

---

## 3. States

| State            | Trigger                                |
|------------------|----------------------------------------|
| `unchecked`      | Not selected                           |
| `checked`        | Selected                               |
| `focus-visible`  | Keyboard focus on the option           |
| `hover`          | Pointer over option                    |
| `disabled`       | `disabled` prop on a single option or the group |
| `error`          | Group-level `error` prop is a non-empty string |
| `read-only`      | Group `readOnly` — selection visible, no change |

Per-card states (in the `card` variant): `default`, `selected`,
`hover`, `focus`, `disabled`.

---

## 4. Usage rules

1. **2–5 options.** Below 2, you don't need a control. Above 5, use
   `Select`. Above 7 with short parallel labels, use
   `SegmentedControl`.
2. **One selection always selected** when a default is sensible. Don't
   render an unselected group of radios as the default state of a
   form unless "no choice yet" is itself a valid state.
3. **Group is the unit of meaning.** Always wrap radios in
   `<RadioGroup>` (or `<fieldset><legend>`). A lone `<Radio>` is a
   smell.
4. **Options are mutually exclusive.** If two options can be true at
   once, you need Checkbox.
5. **No `className` on the indicator or the card body.** Layout-only
   utilities on the group container are fine.
6. **Don't reuse Radio for filter chips.** Use a `Chip` (planned) with
   single-select; filter UI has different conventions.

---

## 5. Accessibility requirements

- **Element.** `<input type="radio">` inside a `<label>`, inside a
  `<fieldset>` with a `<legend>`.
- **Group name.** The `<legend>` is the accessible name of the group.
  Individual radios pick up their option's label.
- **Keyboard.**
  - `Tab` moves to the **selected** option (or the first one if none is
    selected). Tab does not iterate within the group.
  - `Arrow` keys (`Up`/`Down` for vertical, `Left`/`Right` for
    horizontal) move and **select** as they go — this is the WAI-ARIA
    radio-group pattern.
  - `Space` selects the focused option (mostly redundant given arrows).
- **Focus.** 2px ring on the indicator (default and `sm` variants) or
  on the card outline (`card` variant). The ring is preserved on every
  variant.
- **Group error.** `role="alert"` on the error paragraph; the group's
  `aria-invalid="true"` is set on the fieldset.
- **Color independence.** Selected state is communicated by the inner
  dot (or the card's selected outline), not by color alone.
- **Touch target.** 44×44 on touch viewports — the clickable label
  extends past the dot.

---

## 6. Responsive behavior

- **`<sm`.** Vertical layout is the default; horizontal collapses to
  vertical. `card` variant stacks one-per-row.
- **`≥md`.** `horizontal` is legal. `card` variant lays out in a
  grid (2-up or 3-up by container).
- **Long labels** wrap to a second line; the dot stays top-aligned. In
  `card` variant, the description has its own line height.

---

## 7. Content rules

- **Legend.** Noun phrase, sentence case. "Workout intensity", "Billing
  cycle".
- **Option labels.** Parallel grammar. "Easy" / "Moderate" / "Hard",
  not "Easy" / "Bit harder" / "Hardcore".
- **Card descriptions.** ≤ 2 lines. The label is the choice; the
  description is the *why*.
- **No "None" option unless "None" is a meaningful choice.** Hide the
  group instead.

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Radio, RadioGroup } from
   "@famm/ui";`.
2. **Always render `<RadioGroup>`** with a `name` and a `legend` (or
   `aria-labelledby` to an external heading).
3. **Pick the variant by intent.** Plain vertical for short labels;
   `card` when options need a description; `horizontal` only for very
   short parallel labels.
4. **Never use `<input type="radio">` in product code.**
5. **Group-level state.** `value`, `onChange`, `error`, and `disabled`
   live on `RadioGroup`. Per-option `disabled` is allowed but rare.
6. **No `className` on the indicator or the card body.** Layout-only
   utilities on the group container are fine.
7. **Don't use Radio when a `Switch` is correct** — Switch is "applies
   right now"; Radio is "I will commit to one of these on submit."

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Radio
Component set name:  Radio
Variant axes:
  state:  unchecked | checked | hover | focus | disabled | error
  size:   md | sm
Sub-frames:
  Radio / Group               (vertical / horizontal layouts)
  Radio / Card                (the card variant)
  Radio / SegmentedHandoff    (informational: when to switch to SegmentedControl)
```

Tokens used (semantic only): `color.surface.default`,
`color.surface.raised` (card), `color.action.primary` (selected dot),
`color.text.primary`, `color.border.default`, `color.border.focus`,
`color.signal.danger`, `radius.full` (dot), `radius.card` (card
variant), `space.inset.md` (card), `space.inline.sm` (dot ↔ label).

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/radio.tsx
Exports:  Radio, RadioGroup, RadioGroupProps, RadioProps
Import:   import { Radio, RadioGroup } from "@famm/ui";
Tier:     L1 primitive
```

File name `radio.tsx`. Group component is `RadioGroup`, not
`RadioGroupRoot` or `RadioSet`. No alternative radio implementations
exist anywhere else in the monorepo.
