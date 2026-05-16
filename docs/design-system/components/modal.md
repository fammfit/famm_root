# Modal (Dialog)

Status: 🟡 Planned. L1 primitive. Owned by the design-system owner.

Modal is the only approved way to interrupt the user with a focused
task or confirmation. Bottom sheets on mobile, popovers, drawers, and
toasts are different primitives — pick the right one (see Usage rules).

The component renders an accessible `<dialog>` with focus trapping,
scroll locking, backdrop, and a single canonical structure. Custom-built
"modal-shaped div with `position: fixed`" implementations in product
code are a CI failure.

---

## 1. Purpose

A blocking overlay that captures focus and attention to:

- Confirm an irreversible action ("Delete workout?").
- Complete a small, self-contained task ("Edit goal").
- Show a critical alert that demands acknowledgement.

The component owns:

- The backdrop, the scroll lock, the close-on-`Esc` behavior.
- The focus trap on open and the focus restoration on close.
- The compound API (`Modal.Trigger`, `Modal.Header`, `Modal.Title`,
  `Modal.Description`, `Modal.Body`, `Modal.Footer`).
- The motion roles (`enter` / `exit`), with reduced-motion fallback.

If the task is more than one screen, use a route — not a modal.

---

## 2. Variants

```
size:  sm | md | lg | full
tone:  default | destructive | informational
```

- `sm` (max-width 400) for confirms.
- `md` (max-width 560) for small forms — the default.
- `lg` (max-width 720) for richer flows. Use sparingly.
- `full` for content that is genuinely page-shaped on mobile — at
  `<sm` it renders as a full-screen sheet from the bottom.
- `tone` only affects the header treatment (icon color, optional
  accent). It does not unlock a different action vocabulary; primary
  action lives in `Modal.Footer` with the appropriate
  `Button variant`.

Drawers, popovers, and bottom sheets are **not variants of Modal** —
they are separate primitives (`Drawer`, `Popover`, `Sheet`).

---

## 3. States

| State    | Trigger                                              |
|----------|------------------------------------------------------|
| `closed` | Default; no DOM rendered (or `hidden`).              |
| `opening`| Transitioning in; focus moves to initial element.    |
| `open`   | Visible; focus trapped inside; scroll locked.        |
| `closing`| Transitioning out; focus returns to opener.          |

The opening / closing states exist for the motion contract — consumers
treat the modal as a binary `open` boolean and let the component handle
the rest.

---

## 4. Usage rules

1. **Modals interrupt — use them rarely.** If the user can do the task
   in place, do it in place.
2. **One modal at a time.** Stacking modals (opening a modal from
   inside a modal) is banned. If you need a second confirmation,
   replace the current modal's content.
3. **Always confirm destructive actions in a modal.** Destructive
   buttons inline are a smell.
4. **Always provide a close affordance** — a "Cancel" button, a close
   `IconButton` in the header, and `Esc`. All three, always.
5. **Primary action on the right; cancel on the left** (in LTR). The
   destructive action is the primary in a destructive modal — it's
   the action the user came for.
6. **No nested Cards inside `Modal.Body`.** The modal itself is the
   surface.
7. **Don't autofocus the destructive action.** Initial focus goes to
   the first form field or to the cancel button — never to "Delete".
8. **Modals are not for marketing.** No "are you sure you want to
   leave?" interception popups; no upsells.
9. **Don't show modals on page load.** They are user-triggered.

---

## 5. Accessibility requirements

- **Element.** Renders `<dialog>` with the WAI-ARIA dialog pattern as a
  fallback for older browsers.
- **Role.** `role="dialog"`, `aria-modal="true"`.
- **Labelling.**
  - `aria-labelledby` points at `Modal.Title`.
  - `aria-describedby` points at `Modal.Description` (if present).
- **Focus trap.** Focus is constrained to the modal while open. `Tab`
  and `Shift+Tab` cycle through focusable descendants. The first
  focusable element receives focus on open (or an element with
  `autoFocus`); when closing, focus returns to the element that
  triggered the modal.
- **Keyboard.** `Esc` closes (unless the consumer suppresses it for a
  blocking critical alert — rare). `Tab` order follows DOM order.
- **Scroll lock.** Background scroll is disabled while the modal is
  open. iOS Safari scroll lock is handled by the component.
- **Inert background.** The rest of the document is `aria-hidden="true"`
  or `inert` while the modal is open.
- **Motion.** Enter / exit use `motion.role.enter` / `motion.role.exit`
  with a 200ms cap. Both collapse to instant opacity under
  `prefers-reduced-motion`.
- **Backdrop click.** Closes the modal **unless** the modal is
  destructive or the user has typed in a form field — to prevent data
  loss. The component owns this behavior; consumers don't override it.
- **Color contrast.** Header / body / footer text against the modal
  surface meets AA. Backdrop opacity is set so the focus stays inside.

---

## 6. Responsive behavior

- **`<sm`.** All modals render as a bottom sheet from the viewport
  edge, full-width, with a drag handle on the header. `full` modals
  cover the entire viewport.
- **`≥md`.** Centered overlay with the chosen `size` max-width.
  Backdrop fades behind. Margins are at least `space.stack.lg` from
  the viewport edges.
- **`≥lg`.** Same as `md` with the wider max-widths.
- **Long content** scrolls inside `Modal.Body`. The header and footer
  remain pinned.

---

## 7. Content rules

- **Title.** ≤ 6 words. Action-oriented when it's a destructive
  confirm: "Delete workout?", not "Confirm delete". Sentence case,
  trailing `?` only when it's literally a question.
- **Description.** ≤ 2 sentences. Explain consequence and irreversibility
  ("This will permanently remove 24 logged sets.").
- **Buttons.** Primary action label restates the verb from the title:
  "Delete workout" (not "OK"). Cancel is "Cancel" or "Keep editing".
  Never "Yes" / "No".
- **No marketing in modal copy.** No "We'll miss you!"; no emoji.
- **Don't use a modal to display a long article** — that's a route.

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Modal } from "@famm/ui";` —
   compound API with `Modal.Trigger`, `Modal.Header`, `Modal.Title`,
   `Modal.Description`, `Modal.Body`, `Modal.Footer`, `Modal.Close`.
2. **Never write `<div className="fixed inset-0 ...">`.** That's a
   custom modal. Use the primitive.
3. **Don't reach for Radix / Headless UI directly.** The wrapper is at
   L1; product code consumes only `@famm/ui`.
4. **Initial focus.** If there's a form field, focus the first field.
   Otherwise, focus the cancel button. Never the destructive action.
5. **Don't stack modals.** If a second confirmation is needed, replace
   the current modal's content with the confirmation step.
6. **No modal on page load.** Wire it to user action only.
7. **Use the right variant.**
   - Confirm "are you sure?" → `size="sm"`, `tone="destructive"`.
   - Small form → `size="md"`.
   - Large form → reconsider; modal might be wrong.
8. **Close affordances are non-negotiable.** A modal without `Esc`,
   without a Cancel button, and without a close icon is broken.
9. **Don't render destructive actions inline outside a modal** — wrap
   every destructive Button in a Modal-driven flow.
10. **Don't animate modal contents yourself.** The component owns
    enter / exit. Internal content can animate via `motion.role.*`
    roles, never via raw `transition-*` classes.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Modal
Component set name:  Modal
Variant axes:
  size:  sm | md | lg | full
  tone:  default | destructive | informational
  state: closed | open
Sub-frames:
  Modal / Header        (with title, optional description, close icon)
  Modal / Body          (content slot)
  Modal / Footer        (action row, primary on right LTR)
  Modal / Sheet (sm)    (mobile bottom-sheet rendering)
```

Tokens used (semantic only): `color.surface.raised` (modal),
`color.text.primary`, `color.text.muted`, `color.action.primary`,
`color.action.danger`, `color.border.subtle`, `radius.card`,
`elevation.modal`, `space.inset.lg`, `space.stack.md`,
`motion.role.enter`, `motion.role.exit`, and the backdrop
`color.surface.inverse` at the elevation-appropriate opacity.

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/modal.tsx
Exports:  Modal, ModalProps   (Modal.Trigger, Modal.Header, etc. via compound)
Import:   import { Modal } from "@famm/ui";
Tier:     L1 primitive
```

File name `modal.tsx`. The compound API is the recommended call shape;
flat exports (`ModalHeader`, `ModalTitle`, …) are also available for
linting tools that prefer named imports. There is no `Dialog`,
`Popup`, `Lightbox`, `Overlay`, or `Drawer` alias — `Drawer`,
`Popover`, and `Sheet` are distinct future primitives with their own
specs.
