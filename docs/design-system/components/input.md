# Input

Status: 🟢 Stable. L1 primitive. Owned by the design-system owner.

Input is the canonical text-entry primitive. Every text field, email
field, password field, search box, and numeric input in `apps/web`
resolves to this component. Raw `<input>` in product code is banned
outside L1, except for low-level mechanics inside a custom L2 pattern
that wraps and styles it.

For production forms, prefer the L2 `FormField` wrapper — it composes
Input with the label/hint/error contract and enforces the
input-per-label invariant.

---

## 1. Purpose

A single-line text-entry control with a consistent control height, focus
ring, and error contract. The component owns:

- The label association (renders a `<label htmlFor>` when `label` is
  passed).
- The hint-vs-error mutually-exclusive sub-text slot.
- `aria-invalid` and `aria-describedby` wiring.
- The 40px control height (= `space.10`) that meets touch-target rules
  via outer padding tokens.
- The focus ring and the error-tinted ring under failure.

If you need multi-line text → `Textarea` (when shipped). If you need a
choice from a fixed set → `Select`. Inputs don't shapeshift.

---

## 2. Variants

There is one visual variant. The `type` prop selects the native input
type and is the closest thing Input has to variation:

```
type: text | email | password | search | tel | url | number
```

Rules per type:

- `email`, `tel`, `url`: set the matching `inputmode` and `autocomplete`
  hints. Don't add custom validators in the consumer — use the type.
- `password`: never log the value; render with `autocomplete="current-password"`
  or `"new-password"`.
- `search`: pair with a leading search icon via the (future) `leadingIcon`
  slot; for now, place the icon in a wrapping `FormField` row.
- `number`: prefer `type="text"` with `inputmode="numeric"` for forms
  where users type digits but shouldn't see spinners (most product cases).
  `type="number"` is appropriate only for stepper UI.

Reserved (not shipped): a `size` axis (`sm` / `md` / `lg`) — when added,
default stays `md`.

---

## 3. States

| State           | Trigger                                  | Visuals |
|-----------------|------------------------------------------|---------|
| `default`       | Idle, no value                           | Neutral border, muted placeholder |
| `filled`        | Idle, value present                      | Neutral border, primary text |
| `focus-visible` | Keyboard or click focus                  | 2px ring on `color.border.focus` |
| `hover`         | Pointer over (no value change)           | Slight border emphasis |
| `disabled`      | `disabled` prop                          | 50% opacity, not-allowed cursor |
| `read-only`     | `readOnly` prop                          | Sunken surface, no ring on focus |
| `error`         | `error` prop set to a non-empty string   | Danger-tinted border + ring; error text below |
| `with-hint`     | `hint` prop set, no `error`              | Muted hint text below |

Notes:

- `error` and `hint` are mutually exclusive. If both are passed, `error`
  wins and the hint is hidden — that's by design, the error is what the
  user needs.
- The error sub-text carries `role="alert"` so the message is announced
  on next focus.

---

## 4. Usage rules

1. **Always associate a label.** Pass `label` or wrap with `FormField`.
   A floating placeholder is not a label.
2. **No bare `<input>` in `apps/web`.** Use `Input`. Inside L2 patterns
   that wrap Input, you may render the bare element — and you also must
   re-implement the label/error contract.
3. **No height / padding overrides.** The control height is 40px; the
   padding is `space.inset.sm` × `space.inset.xs`. If a design needs a
   different size, propose a `size` axis.
4. **Error is a string, not a boolean.** Pass the message; the
   component handles the visuals and ARIA. `error={true}` does nothing.
5. **Don't combine `disabled` and `error`.** A disabled field can't have
   a fixable error — clear the error when you disable.
6. **`readOnly` ≠ `disabled`.** Read-only is focusable, copyable,
   submitted with the form. Disabled is none of those.
7. **No icons via `className`.** Wait for the (planned) `leadingIcon`
   prop, or wrap with a sibling icon inside a `FormField`. Don't paste
   an `<svg>` inside the input visually via `padding-left`.
8. **Numeric input: prefer `inputmode="numeric"`** with `type="text"`.
   Use `type="number"` only when the spinner is desired.

---

## 5. Accessibility requirements

- **Label association.** When `label` is passed, the component generates
  an `id` (slug of the label) and links it via `htmlFor` / `id`. If you
  pass your own `id`, that wins. **Every input has a programmatic label.**
- **`aria-invalid`.** Set automatically when `error` is non-empty.
- **`aria-describedby`.** Points at the error node (when present) or the
  hint node (when present). The component manages this; do not pass
  your own `aria-describedby`.
- **Error announcement.** Error paragraph carries `role="alert"`, so the
  message is announced when it appears. Don't replace this with a toast
  for field-level errors.
- **Focus ring.** 2px ring on `color.border.focus` (or
  `color.signal.danger` in the error state). Never remove it.
- **Touch target.** 40px height + `space.inset.sm` horizontal padding
  meets WCAG 2.2 reach in form layouts. In dense toolbars, pair with
  surrounding padding to keep the effective hit area at 44×44.
- **Autocomplete.** Always pass `autocomplete`. Login forms use
  `username` and `current-password` / `new-password`. Address fields
  use the documented `autocomplete` tokens.
- **Password visibility toggle.** Not built in. When needed, add a
  trailing `IconButton` (when shipped); the toggle button has its own
  `aria-pressed` and `aria-label`.

---

## 6. Responsive behavior

Input is `w-full` of its parent. Layout governs width:

- **`<sm` (mobile).** Inputs span the form width with `space.inset.md`
  page inset. Stacked vertically with `space.stack.sm` between rows.
- **`≥md`.** Inputs sit in a grid; widths come from the column.
- **`≥lg`.** Same as `md`. Don't allow an Input to stretch past ~640px
  visual width — long lines hurt scannability.

What does **not** change at any breakpoint:

- Control height stays 40px.
- Font size stays `text-sm` (14px).
- Focus ring stays 2px.

---

## 7. Content rules

- **Label.** Sentence case, 1–3 words, no trailing colon. "Email
  address" not "EMAIL:".
- **Placeholder.** A *format example*, not instructions. "you@famm.fit"
  not "Enter your email". Never use a placeholder in lieu of a label.
- **Hint.** Format guidance or context. ≤ 1 line. Don't repeat the
  label.
- **Error.** Specific and actionable. "Email must include @" beats
  "Invalid input". Sentence case, no terminal period for short
  messages.
- **No emoji** in labels, placeholders, hints, or errors.
- **Input value formatting** (commas in numbers, masked phone formats)
  is the consumer's responsibility — keep the raw value in state.

---

## 8. AI implementation instructions

1. **Import.** `import { Input } from "@famm/ui";`. Never deep-import.
2. **Never write `<input>` in `apps/web`.** Use `Input`. If a `FormField`
   wrapper exists for the form's context, use that instead.
3. **Always pass `label` or wrap in `FormField`.** No exceptions for
   "the placeholder is enough".
4. **Pass `error` as a string** — the visual + ARIA wiring happens
   automatically. Don't manually set `aria-invalid` or
   `aria-describedby`.
5. **Choose `type` correctly.** Email → `type="email"`. Numeric in a
   product form → `type="text" inputMode="numeric"`. Password →
   `type="password" autoComplete="current-password"`.
6. **Don't replace the error message with a toast.** Field-level errors
   stay attached to the field.
7. **Don't toggle visibility via `className="bg-..."` or
   `"border-..."`.** All visual states come from the `error` /
   `disabled` / `readOnly` props.
8. **Hint and error are mutually exclusive.** Don't pass both at once.
9. **For autocompletion, always pass `autoComplete`** — assistive tech
   and password managers depend on it.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Input
Component set name:  Input
Variant axes:
  type:  text | email | password | search | tel | url | number
  state: default | filled | hover | focus | disabled | read-only | error
  hint:  none | hint | error
```

The component-set thumbnail shows the default `text + default` state.
A second frame within the section illustrates Input inside a
`FormField` so designers see the production composition. Tokens used
(semantic only): `color.surface.default`, `color.surface.sunken`
(read-only), `color.text.primary`, `color.text.muted` (placeholder),
`color.border.default`, `color.border.focus`, `color.signal.danger`,
`radius.control`, `space.inset.sm`, `space.inset.xs`.

---

## 10. Code component naming convention

```
Source:    packages/ui/src/components/primitives/input.tsx
Export:    Input, InputProps
Import:    import { Input, type InputProps } from "@famm/ui";
Tier:      L1 primitive
Pattern:   FormField (L2) — packages/ui/src/components/patterns/form-field.tsx
```

File name is lowercase-kebab (`input.tsx`). The L2 wrapper is named
`FormField`, not `InputField` — it composes any single form control
(Input, Select, Textarea, etc.), not just Input. There are no other
exports that style themselves as text inputs anywhere in the monorepo.
