# Checkbox

Status: 🟡 Planned. L1 primitive. Owned by the design-system owner.

Checkbox is the only approved way to toggle a binary or
many-of-many choice in a form. Standalone toggling of a setting (where
the result takes effect immediately) is `Switch`, not Checkbox.

Raw `<input type="checkbox">` is banned in product code — it can't
deliver the focus ring, the indeterminate visual, or the label hit
target consistently across browsers.

---

## 1. Purpose

A two-or-three-state control for selecting one or more items from a
set, or for confirming an opt-in inside a form. The component owns:

- The 18×18 box visual with the check / indeterminate glyph.
- The clickable label that extends the hit area to the full row.
- The focus ring on the box.
- `aria-checked` (including `"mixed"` for indeterminate).
- The error-tinted border in failed validation.
- The disabled-vs-readonly distinction.

For "I want this to apply right now" toggles, see `Switch`.

---

## 2. Variants

```
size:     md (default) | sm   (sm only allowed in dense lists with 44×44 row padding)
emphasis: default | accent     (`accent` reserved for "highlight this option" — rare)
```

There is no `variant` axis on Checkbox — it's a single visual.
`emphasis` is reserved for surfaces where one option matters more than
the rest (e.g. "Remember me"); use sparingly.

---

## 3. States

| State            | Trigger                                |
|------------------|----------------------------------------|
| `unchecked`      | `checked={false}`                      |
| `checked`        | `checked={true}`                       |
| `indeterminate`  | `checked="indeterminate"`              |
| `focus-visible`  | Keyboard focus on the box              |
| `hover`          | Pointer over box or label              |
| `disabled`       | `disabled` prop                        |
| `error`          | `error` prop is a non-empty string     |
| `read-only`      | `readOnly` prop — value visible, no change |

Notes:

- `indeterminate` is a *visual* state, set explicitly by the consumer
  when this box represents "some children selected." Clicking it does
  not cycle through indeterminate — the consumer decides whether to
  go to checked or unchecked.
- A Checkbox without a visible label still needs an accessible name
  (`aria-label` or `aria-labelledby`).

---

## 4. Usage rules

1. **Use Checkbox for many-of-many.** Use Radio for one-of-many. Use
   Switch for "applies right now" toggles.
2. **Always render a label** — visible by default. Hidden-label
   checkboxes (e.g. inside a row of a table to select rows) must pass
   `aria-label`.
3. **The label is part of the hit area.** Clicking the text toggles the
   box. Never render a label outside the component without wiring it
   up.
4. **Indeterminate is computed, not user-toggleable.** A Checkbox that
   represents a group's children is set to `"indeterminate"` when some
   children are checked. The user's click resolves to `checked=true`
   or `false` — the consumer decides which.
5. **No `className` on the box visual.** Layout-only utilities on the
   wrapper are allowed.
6. **Validation errors** belong on the **group**, not on each Checkbox.
   For a "select at least one" rule, render one error message under the
   group, not seven under each box.
7. **Don't disable as a way to lock state.** Disabled controls aren't
   submitted. Use `readOnly` if you need the value to persist.

---

## 5. Accessibility requirements

- **Element.** `<input type="checkbox">` rendered inside a `<label>`.
  Custom-painted box is decorative; the native input is the focusable,
  accessible element.
- **Accessible name.**
  - Visible label: provided as children (the text inside the label).
  - Hidden label: `aria-label`.
  - Composed label (e.g. icon + text): `aria-labelledby`.
- **`aria-checked`.** Native checked maps automatically; for
  `"indeterminate"`, set the `indeterminate` DOM property and
  `aria-checked="mixed"`.
- **Keyboard.** `Space` toggles. `Tab` moves focus. There is no
  `Enter` activation — Enter submits the surrounding form, which is
  the expected behavior.
- **Focus.** 2px ring on `color.border.focus` around the box, **not**
  the label. Hit area still extends to the label; only the visual
  ring sits on the box.
- **Group semantics.** A set of related checkboxes lives inside a
  `<fieldset>` with a `<legend>`. The legend is the group's accessible
  name; individual checkboxes do not repeat it.
- **Error.** Group-level error carries `role="alert"` like Input
  errors; per-box errors are not announced individually.
- **Touch target.** 44×44 minimum on touch viewports; the clickable
  label area extends past the box to meet this.
- **Color independence.** Checked state is communicated by the glyph,
  not by color alone. Don't rely on the accent tint as the only signal.

---

## 6. Responsive behavior

- **`<sm`.** Checkboxes in a group stack vertically with `space.stack.sm`
  between rows. The label wraps; the box stays aligned to the first
  line.
- **`≥md`.** Groups can lay out as 2-column when there are ≥ 6
  options. Don't squeeze them onto one row if labels are longer than
  ~2 words.
- The 18×18 visual does not scale with breakpoints. Hit targets stay
  44×44 on touch via the label.

---

## 7. Content rules

- **Label.** Sentence case, 1–6 words. A short, complete affirmative:
  "Email me workout summaries", "Send weekly digest". Avoid yes/no
  framings — the box is the yes/no.
- **No double negatives.** "Don't send notifications" is fine; "Don't
  not send notifications" is not.
- **Group legend.** The `<legend>` is a noun phrase describing the
  group: "Notifications", "Days of the week".
- **Consent and legal text.** Pair with a Link inside the label:
  `<Checkbox>I accept the <Link href="...">terms</Link>.</Checkbox>`.
  Don't put the link in a separate paragraph below the box.

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Checkbox, CheckboxGroup } from
   "@famm/ui";`.
2. **Use Checkbox for many-of-many, Radio for one-of-many, Switch for
   right-now toggles.** Pick by semantics.
3. **Never use `<input type="checkbox">` in product code.**
4. **Visible label is the default.** Pass it as children. Hidden-label
   use cases pass `aria-label`.
5. **`indeterminate` is set explicitly** as `checked="indeterminate"`
   or via the `indeterminate` prop — it is not a state the user can
   click into.
6. **Group via `<CheckboxGroup>` (or `<fieldset>` if the group
   component isn't ready).** Render one error for the group, not per
   box.
7. **No `className` on the box.** Layout-only on the wrapper is fine.
8. **Don't restyle the check glyph.** It comes from the component, in
   the right size and stroke.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Checkbox
Component set name:  Checkbox
Variant axes:
  state:    unchecked | checked | indeterminate | disabled | error | read-only
  emphasis: default | accent
  size:     md | sm
Sub-frames:
  Checkbox / Group           (a labeled fieldset with multiple Checkboxes)
  Checkbox / Row in table    (hidden-label use case for row-select)
```

Tokens used (semantic only): `color.surface.default`,
`color.action.primary` (checked fill), `color.text.on-accent` (glyph),
`color.text.primary` (label), `color.border.default`,
`color.border.focus`, `color.signal.danger`, `radius.sm` (box),
`space.inline.sm` (gap between box and label).

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/checkbox.tsx
Exports:  Checkbox, CheckboxGroup, CheckboxProps
Import:   import { Checkbox, CheckboxGroup } from "@famm/ui";
Tier:     L1 primitive
Pattern:  FormField (L2) may wrap a single Checkbox; CheckboxGroup is
          itself a primitive (renders <fieldset><legend>…).
```

File name `checkbox.tsx`. No "Tickbox", "Selector", or feature-prefixed
checkbox components exist anywhere else in the monorepo.
