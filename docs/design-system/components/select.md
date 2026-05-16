# Select

Status: 🟡 Planned. L1 primitive. Owned by the design-system owner.
Tracked in the next minor of `@famm/ui`. This document is the spec the
implementation must match.

Select is the only approved way to let a user choose **one** value from
a short, known set. Long lists, multi-select, type-ahead, and async
search are different problems with different primitives (`Combobox`,
`MultiSelect`, `Search` — all planned).

Raw `<select>` is acceptable only inside L1 itself; in product code
`<select>` is banned because it can't carry the focus ring, the error
contract, or the icon trailing affordance consistently across browsers.

---

## 1. Purpose

A single-value picker with a styled trigger, an accessible listbox, and
the same label / hint / error contract as `Input`. The component owns:

- Keyboard navigation (`Up`/`Down`/`Home`/`End`/`Esc`/type-to-jump).
- The focus ring on the trigger and the highlight on the active option.
- ARIA wiring (`role="combobox"` or native `<select>` fallback).
- Touch-target sizing (40px trigger height, 44px minimum on touch).
- Hint vs error sub-text, mutually exclusive.

For choosing from a list of ~5–15 options. Above that, use `Combobox`
with filtering.

---

## 2. Variants

```
type:  single                 (only variant in v1; `multi` planned)
size:  sm | md | lg           (default `md`; `sm` only inside containers preserving 44×44)
```

Trigger appearance is a single style — a control-height field with a
trailing chevron. No "filled" vs "outlined" — that's the input system,
and a Select should look like an Input so users recognize it.

---

## 3. States

| State           | Trigger                                |
|-----------------|----------------------------------------|
| `default`       | No selection                           |
| `selected`      | A value is chosen; selected label visible in trigger |
| `open`          | Listbox is visible                     |
| `focus-visible` | Keyboard focus on trigger              |
| `hover`         | Pointer over trigger                   |
| `disabled`      | `disabled` prop                        |
| `read-only`     | `readOnly` prop — value shown, listbox does not open |
| `error`         | `error` prop is a non-empty string     |
| `with-hint`     | `hint` set, no `error`                 |

Per-option states inside the open listbox: `default`, `active`
(keyboard-highlighted), `selected`, `disabled`.

---

## 4. Usage rules

1. **Single value only.** For multiple selections, wait for
   `MultiSelect`. Don't fake it with multiple Selects.
2. **5–15 options.** Below 5, use a radio group or segmented control.
   Above 15, use `Combobox` with filtering.
3. **Always pass a `label`** or wrap in `FormField` — same rule as
   `Input`.
4. **Options carry stable values.** `value` is a string ID, `label` is
   the human text. Never use the label as the value.
5. **Default selection only when there's a sensible default.** "All",
   "Any", "Pick one…" are explicit placeholder options; never silently
   pick the first option for the user.
6. **No nested option groups beyond one level.** Use `OptionGroup` with
   a `label`; do not nest groups within groups.
7. **No `className` for trigger visuals.** All visuals come from props.
8. **Open direction is automatic.** The listbox flips up when there isn't
   room below. Don't override.

---

## 5. Accessibility requirements

- **Pattern.** WAI-ARIA 1.2 Combobox (single-select). Trigger is
  `role="combobox"` with `aria-haspopup="listbox"` and
  `aria-expanded`. Listbox is `role="listbox"`. Options are
  `role="option"` with `aria-selected`.
- **Label association.** Trigger has an `aria-labelledby` pointing at
  the visible label.
- **Keyboard.**
  - Trigger focused: `Down` / `Up` / `Enter` / `Space` opens; typing a
    character jumps to the first matching option.
  - Open: `Up`/`Down` moves the active option, `Home`/`End` jumps,
    `Enter`/`Space` selects, `Esc` closes without changing.
  - Tab leaves the component and closes the listbox, committing the
    current selection.
- **Focus management.** When opening, focus stays on the trigger;
  `aria-activedescendant` points at the active option. When closing,
  focus returns to the trigger.
- **`aria-invalid` / `aria-describedby`.** Wired automatically when
  `error` is non-empty, mirroring Input.
- **Touch target.** Trigger is 40px tall; on touch viewports, the
  surrounding `FormField` row provides the 44×44 floor.
- **No `tabindex="-1"`** on the trigger. Focus order is DOM order.

---

## 6. Responsive behavior

- **`<sm`.** On touch viewports, the listbox renders as a bottom
  sheet (a `Sheet` pattern) rather than an inline popover. Trigger is
  always full-width inside a `FormField`.
- **`≥md`.** Listbox is a popover anchored to the trigger, width =
  trigger width (minimum 240px). Flips up when room is short.
- **Long labels** in the trigger truncate with ellipsis. Long labels in
  options wrap to a second line.

---

## 7. Content rules

- **Label.** Sentence case, 1–3 words. Same rules as `Input`.
- **Placeholder option.** Phrased as an action or a state: "Select a
  trainer", "All categories". Lower-case "select…" or "choose…" is fine
  but mark the option `disabled` if it's not a valid choice.
- **Option labels.** Sentence case unless the value is a proper noun.
  Keep options parallel in form ("Daily" / "Weekly" / "Monthly", not
  "Daily" / "Once a week" / "Monthly").
- **Counts in options.** "All trainers (12)" is OK; the parenthetical
  is part of the label.
- **No emoji in options** unless it's the only sensible representation
  (e.g. flag-based locale switch).

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Select, SelectOption } from
   "@famm/ui";`. Never deep-import.
2. **Never use raw `<select>` in `apps/web`.** Until Select ships, use
   `Input` with a `list` or wait — do not invent a styled `<select>`.
3. **Pass options as data, not children.** Prefer
   `<Select options={items} />` where `items` is `{ value, label,
   disabled?, group? }`. The children API is reserved for `OptionGroup`
   nesting.
4. **Always pass `label` or wrap in `FormField`.** No placeholder-as-label.
5. **`value` is a string.** Convert numbers / enums on the way in and
   out. The internal contract is string-keyed for ARIA stability.
6. **Pass `error` as a string.** Same contract as Input.
7. **No `className` for the trigger.** Layout-only utilities on the
   surrounding `FormField` are fine.
8. **Don't reach for a third-party `Select`.** The component is wrapped
   at L1 — extend the primitive, do not import Radix/Combobox/Headless
   UI directly into product code.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Select
Component set name:  Select
Variant axes:
  size:  sm | md | lg
  state: default | hover | focus | open | selected | disabled | read-only | error
Sub-frames:
  Select / Listbox        (the open menu)
  Select / Option         (single option states: default | active | selected | disabled)
  Select / OptionGroup    (grouped options with a group label)
```

Tokens used (semantic only): `color.surface.default`,
`color.surface.raised` (listbox), `color.text.primary`,
`color.text.muted` (placeholder), `color.border.default`,
`color.border.focus`, `color.action.primary` (active option highlight),
`color.signal.danger`, `radius.control`, `radius.card` (listbox),
`elevation.overlay`, `space.inset.sm`, `space.inset.md`,
`motion.role.enter`, `motion.role.exit`.

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/select.tsx
Exports:  Select, SelectOption, OptionGroup, SelectProps
Import:   import { Select } from "@famm/ui";
Tier:     L1 primitive
Pattern:  FormField (L2) wraps Select like it wraps Input.
```

File name `select.tsx`, lowercase-kebab. Internal helpers are
`SelectTrigger`, `SelectListbox`, `SelectOption` — exported only if a
consumer needs to compose; the default API is the data-driven `<Select
options={…} />`. No `Dropdown`, `Picker`, or `Menu` aliases anywhere
in the monorepo.
