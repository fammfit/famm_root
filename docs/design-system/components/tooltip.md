# Tooltip

Status: 🟡 Planned. L1 primitive. Owned by the design-system owner.

Tooltip is the only approved way to attach a **short, non-essential
explanation** to an element on hover or focus — a clarifying label for
an icon-only button, the units of a stat, a glossary term.

Tooltips are **supplemental**. Content that the user must read to
complete a task is not a tooltip — it's body copy, a hint on a
`FormField`, or a `Popover`.

Custom `title` attributes are tolerated only for absolutely simple cases
(`<input title="...">`); for anything in product UI, use Tooltip so the
behavior is consistent and accessible on touch and keyboard.

---

## 1. Purpose

A small floating label anchored to a trigger, shown on hover, focus,
and long-press. The component owns:

- The trigger / content compound API.
- The hover delay, focus reveal, and dismiss-on-blur behavior.
- Positioning with automatic flipping when the viewport edge is near.
- Touch handling — long-press to reveal; tap-elsewhere to dismiss.
- `aria-describedby` wiring on the trigger.
- Reduced-motion behavior (fade only, no slide).

For interactive floating content (links, buttons, forms), use
`Popover` (planned). Tooltips never contain interactive elements.

---

## 2. Variants

```
side:   top (default) | right | bottom | left
align:  center (default) | start | end
size:   sm (default) | md
```

- `sm` (≤ 240px max-width) is the default — single line or a short
  phrase.
- `md` (≤ 320px max-width) is for two-line explanations. Above this,
  it's not a tooltip.
- `side` and `align` are starting positions; the component flips when
  the tooltip would overflow the viewport.

There is no "rich" variant. Rich content (formatted text, multiple
paragraphs, links) is a `Popover`, not a Tooltip.

---

## 3. States

| State           | Trigger                                     |
|-----------------|---------------------------------------------|
| `hidden`        | Default                                     |
| `entering`      | Hover/focus delay elapsed; fading in        |
| `visible`       | Displayed                                   |
| `exiting`       | Pointer left / focus lost; fading out       |

Behavior:

- **Open delay.** 500ms default on hover; immediate on focus and
  long-press.
- **Close delay.** 200ms when the pointer leaves the trigger (allowing
  a small grace period when crossing into the tooltip — though the
  tooltip itself is non-interactive).

---

## 4. Usage rules

1. **Tooltips are supplemental.** If the user needs the content to do
   their job, it's not a tooltip.
2. **Always attach to an interactive element** — Button, Link,
   `IconButton`, an `aria-pressed` toggle. Tooltips on static text are
   unreachable by keyboard.
3. **Icon-only buttons get a tooltip** with the same label as their
   `aria-label`. The tooltip is the visual; the aria-label is the
   announcement; they should match.
4. **No interactive content inside a Tooltip.** No links, no buttons,
   no inputs. Use `Popover`.
5. **One tooltip at a time.** The component enforces this; opening a
   second hides the first.
6. **No `className` for visuals.** The tooltip background, padding, and
   radius are fixed.
7. **Don't autofocus the trigger** to reveal a tooltip on page load.
   That defeats the supplemental contract.
8. **Don't use Tooltip to convey errors or warnings.** Errors live on
   the FormField; warnings live in inline alerts or Toasts.

---

## 5. Accessibility requirements

- **Pattern.** WAI-ARIA Tooltip (`role="tooltip"`).
- **Trigger wiring.** The trigger receives `aria-describedby` pointing
  at the tooltip id while the tooltip is visible.
- **Reveal triggers.** Hover, focus, and long-press (touch). Tap-away
  closes; `Esc` closes when the trigger is focused.
- **Touch.** Long-press (~500ms) reveals; another tap anywhere
  dismisses. The trigger remains its original control — long-press
  does not "activate" it.
- **Disabled triggers.** Tooltips on disabled buttons require the
  trigger to remain focusable (`aria-disabled="true"` instead of the
  `disabled` attribute) — otherwise the tooltip is unreachable.
- **No focus trap.** The tooltip is not focusable; `Tab` passes through
  to the next focusable element.
- **Reduced motion.** Slide collapses to fade; the duration is capped
  at `motion.duration.fast`.
- **No essential content.** Anything in a tooltip must also be
  obtainable some other way — through the surrounding label, the
  control's name, or visible nearby copy.

---

## 6. Responsive behavior

- **`<sm` / touch.** Tooltips render via long-press. Positioning
  prefers `top` to avoid the thumb; flips to `bottom` when at the top
  of the viewport.
- **`≥md` / pointer.** Default `top` positioning; flips to keep the
  tooltip in the viewport.
- **Width.** Capped at the variant's max (240px `sm`, 320px `md`).
  Wraps to multiple lines as needed.

The tooltip never causes layout shift in the surrounding content — it
floats above.

---

## 7. Content rules

- **1 short sentence or a noun phrase.** "Personal record",
  "Tap to log a set", "Bytes per second".
- **Sentence case.** No trailing punctuation for fragments; a period
  for full sentences.
- **No "Click here", no instructions to interact** — the trigger is
  the affordance.
- **No emoji.**
- **For icon-only triggers**, the tooltip text matches the trigger's
  `aria-label`. Maintaining two strings that mean the same thing
  invites drift; the component accepts a single `label` prop and uses
  it for both.

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Tooltip } from "@famm/ui";` —
   compound API with `Tooltip.Trigger` and `Tooltip.Content`, or the
   convenience form `<Tooltip label="...">{trigger}</Tooltip>`.
2. **Use the convenience form by default.** It wires `aria-describedby`
   and handles open / close.
3. **Never use the native `title` attribute** in product code. It's
   inaccessible on touch and inconsistent across browsers.
4. **Every icon-only button has a Tooltip.** The Tooltip label and the
   button's `aria-label` should be the same string (the convenience
   form does this automatically).
5. **No interactive content.** If you want a button or a link inside,
   you want a `Popover`.
6. **Don't put tooltips on plain text** — keyboard users can't reach
   them.
7. **Don't use Tooltip for form-field hints.** Pass `hint` on the
   Input.
8. **Don't use Tooltip to apologise** ("We know this is confusing…").
   Improve the underlying UI.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Tooltip
Component set name:  Tooltip
Variant axes:
  side:  top | right | bottom | left
  align: center | start | end
  size:  sm | md
  state: hidden | visible
Sub-frames:
  Tooltip / OnIconButton    (canonical use case)
  Tooltip / Flipping        (illustrating viewport-edge behavior)
  Tooltip / Mobile          (long-press affordance reference)
```

Tokens used (semantic only): `color.surface.inverse`,
`color.text.inverse`, `radius.sm`, `elevation.overlay`,
`space.inset.sm`, `font.role.caption`, `motion.role.enter`,
`motion.role.exit`. The inverted surface is intentional — it
contrasts strongly with both light and dark themes.

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/tooltip.tsx
Exports:  Tooltip, TooltipProps   (Tooltip.Trigger, Tooltip.Content)
Import:   import { Tooltip } from "@famm/ui";
Tier:     L1 primitive
```

File name `tooltip.tsx`. `Popover` (interactive floating content) is a
separate, future primitive with its own spec. No `Hint`, `InfoTip`,
`Bubble`, or feature-prefixed tooltip components exist anywhere else
in the monorepo.
