# Accessibility

Baseline: **WCAG 2.2 Level AA** for every user-facing surface. AAA where it's
free. These rules are binding; CI enforces the ones marked **Enforced**.

## Contrast

- **Body text ≥ 4.5:1** against its background.
- **Large text (≥ 18px or ≥ 14px bold) ≥ 3:1.**
- **Meaningful UI graphics (icons that carry meaning, focus rings, form
  borders) ≥ 3:1.**
- **Enforced**: tokens are pre-validated. If you bypass a token, the contrast
  is your problem and reviewers will reject it.

| Pair | Light ratio | Dark ratio |
|------|------------|------------|
| `text-primary` / `surface-default` | 16.7 : 1 | 15.4 : 1 |
| `text-muted` / `surface-default`   | 4.9 : 1  | 4.6 : 1  |
| `text-onAccent` / `accent`         | 8.1 : 1  | 6.2 : 1  |

If you add a new color, add its ratio against every surface it's used on to
the PR description.

## Keyboard

- **Every interactive element is reachable by Tab** in visual order.
- **Visible focus ring** uses `--color-focus-ring` token. Never
  `outline: none` without a replacement of equal or better contrast.
- **Escape closes** modals, popovers, and command menus, returning focus to
  the trigger.
- **Arrow keys** navigate within composite widgets (tabs, listbox, calendar);
  Tab moves between widgets.
- **Enter/Space** activate buttons identically. `<div onClick>` does not.

## Screen readers

- **Every interactive element has an accessible name.** Visible label, or
  `aria-label`, or `aria-labelledby`.
- **Icons that convey meaning** carry an `aria-label`; decorative icons get
  `aria-hidden="true"`.
- **Live regions** (`aria-live="polite"`) for changing data the user needs:
  timers, set counters, async feedback. Use `role="alert"` for errors.
- **Modal dialogs** trap focus, expose `aria-modal="true"`, and have a label
  via `aria-labelledby`.
- **Status of form fields**: `aria-invalid="true"` on error, error message
  associated via `aria-describedby`. `FormField` wires this automatically.

## Touch targets

- **44×44 CSS px minimum** on touch viewports (WCAG 2.2 §2.5.8).
- **24×24 minimum** on pointer-only viewports.
- The `Button` `size="icon"` variant ships at 44×44 (`h-11 w-11`). Anything
  smaller is a hard reject.
- Icon-only controls inside dense tables get a 44×44 hit area via padding,
  even if the visual icon is smaller.

## Motion

- **Respect `prefers-reduced-motion`.** Animations > 200ms or involving
  translation must have a reduced variant.
- **Use `useReducedMotion()`** from `@famm/ui` to branch in code. Tokens in
  `tokens.css` already collapse `--duration-*` to 0ms when reduced.
- **No infinite loops** except for active loading indicators.
- **No parallax, no auto-playing video** in product surfaces.

## Forms

- **Every input has a `<label>`.** Use the `FormField` pattern — bare
  `<input>` is banned outside L1 primitives.
- **Required fields are marked** both visually (asterisk) and via
  `aria-required`.
- **Error messages live below the field**, not in tooltips. Errors are
  announced via `role="alert"`.
- **Autocomplete attributes are set** wherever applicable (`email`, `tel`,
  `current-password`, `one-time-code`, etc.).

## Color is never the only signal

- **Errors are red and have an icon** (or label) — not red alone.
- **PR state is gold and has a label or "PR" badge** — not gold alone.
- **Required fields have an asterisk** — not red border alone.

## Content (accessible writing)

- **Plain language.** Aim for an 8th-grade reading level on UI copy.
- **Sentence case** for buttons, labels, headings (not Title Case).
- **No jargon** in error messages. "Couldn't connect — try again" beats
  "ERR_NETWORK_FAILURE".
- **Buttons say what they do.** "Save changes", not "OK". "Delete workout",
  not "Yes".

## What CI enforces

| Rule | Tool |
|------|------|
| No raw hex/px/rgb outside L1 primitives | `eslint:no-restricted-syntax` |
| No inline `style={}` outside L1 | `eslint:no-restricted-syntax` |
| `jsx-a11y/recommended` + tightened defaults | `eslint-plugin-jsx-a11y` |
| Per-component axe-core tests | Vitest (planned) |
| Lighthouse a11y ≥ 95 on key routes | CI (planned) |

What CI doesn't catch, the PR checklist does:

- [ ] Keyboard tested
- [ ] Focus visible on every interactive element
- [ ] Contrast verified (or unchanged)
- [ ] Reduced-motion verified
- [ ] Screen reader pass (VoiceOver / NVDA) for new patterns
