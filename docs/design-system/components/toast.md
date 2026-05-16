# Toast

Status: 🟡 Planned. L1 primitive + L2 host. Owned by the design-system
owner.

Toast is the only approved way to surface transient feedback that
**doesn't require user action** — "Workout saved", "Network back online",
"Couldn't reach the server, retrying…". For feedback that the user must
acknowledge or that blocks progress, use `Modal` or an inline error.

Custom "toast" implementations (a `<div>` with `position: fixed` and a
`setTimeout`) are a CI failure.

---

## 1. Purpose

A transient, non-modal notification rendered in a managed stack at a
fixed corner of the viewport. The component owns:

- The toast item (`Toast`) — the visual primitive.
- The host (`ToastHost`) — the stacking container, mounted once at the
  app shell level.
- The imperative API (`toast.success(...)`, `toast.error(...)`) that
  any feature can call without hauling a context provider.
- Auto-dismiss timers, hover-pause behavior, and keyboard dismissal.
- Reduced-motion handling (slide → fade collapse).

Use a Toast for: a successful save, a non-fatal error, a connectivity
status change, a multi-step background operation completion.

Do **not** use a Toast for: form validation errors (they live on the
field), destructive confirmations (Modal), critical errors that need
the user to do something (inline alert).

---

## 2. Variants

```
tone:    info (default) | success | warning | danger
size:    sm (default) | md
action:  none (default) | one
```

- `tone` controls the leading icon and accent stripe. Pick by meaning,
  not by color preference.
- `md` is reserved for toasts that carry an action button.
- `action="one"` exposes a single trailing button for `Undo`,
  `Retry`, or `View`. Two-action toasts are banned — if you need two
  actions, you need a Modal.

---

## 3. States

| State          | Trigger                                       |
|----------------|-----------------------------------------------|
| `entering`     | Just mounted; sliding/fading in               |
| `visible`      | Displayed; timer running                      |
| `paused`       | Hovered or focused — timer pauses             |
| `dismissing`   | Auto-dismiss or user-dismiss; sliding/fading out |
| `expired`      | Removed from the stack                        |

Per-toast options: `duration` (ms, default 5000), `dismissible`
(default true), `tone`, `action`. `duration: Infinity` is allowed only
for `danger` toasts that report an ongoing failure (and must always be
`dismissible`).

---

## 4. Usage rules

1. **At most three visible at a time.** New toasts push old ones out.
2. **One ToastHost per app shell.** Render it once in
   `apps/web/src/app/layout.tsx`. Never instantiate a second host.
3. **No `position: fixed` toasts in feature code.** Use the imperative
   API.
4. **Toasts don't replace modals.** A destructive confirm is never a
   toast. A toast can confirm completion after the modal closed.
5. **Toasts don't replace inline errors.** Form-field errors stay on
   the field.
6. **`action="one"` is for genuinely reversible operations.** "Undo
   delete" is fine; "Undo logout" is not.
7. **Don't render Toast for trivial state changes.** A toast for every
   click is noise.
8. **Don't carry critical content in a toast** — it disappears. If the
   user must see it, it's not a toast.
9. **No HTML in the message** — text only. Links are not allowed inside
   the message; the action slot is the only interactive surface.

---

## 5. Accessibility requirements

- **Region.** The host renders a single `<ol role="region"
  aria-label="Notifications">` at the corner.
- **Live region.**
  - `info` / `success` / `warning` toasts: `aria-live="polite"` on
    the host.
  - `danger` toasts: announced via a sibling `role="alert"` element so
    they preempt the user's current task.
- **Focus.** Toasts do not steal focus on appearance. The action
  button (if present) is reachable via `Tab` — keyboard users can
  press `F6` (when shipped) to jump into the toast region.
- **Keyboard dismissal.** `Esc` on a focused toast dismisses it.
- **Hover / focus pause.** Hovering or focusing any toast pauses every
  timer in the stack; leaving resumes them.
- **Auto-dismiss timing.**
  - `info` / `success`: 5s default.
  - `warning`: 7s.
  - `danger`: 10s, or `Infinity` if the failure is ongoing.
  - All durations scale with `prefers-reduced-motion` and the user's
    OS motion preferences.
- **Color independence.** Tone is communicated by the leading icon and
  the accent stripe, not by color alone.
- **Reduced motion.** Slide-in collapses to fade-in; slide-out collapses
  to fade-out. Stack shifts also collapse.

---

## 6. Responsive behavior

- **`<sm`.** Toasts render at the **top** of the viewport, full-width
  with `space.inset.md` page inset, stacked vertically.
- **`≥md`.** Toasts render at the **bottom-right** by default,
  content-width up to a 400px max, stacked vertically.
- **`≥lg`.** Same as `md`.

The position is configurable on the host (`position` prop) but should
be set once per app — not changed per toast.

---

## 7. Content rules

- **Title (optional).** Only in `md` variant. 1–4 words.
- **Message.** 1 sentence. Subject + verb + result. "Workout saved."
  not "Saved!". Sentence case, terminal period.
- **No exclamation marks** for routine success. Reserve "!" for the
  rare PR-style celebration.
- **No emoji** — tone is communicated by the icon, which is owned by
  the component.
- **Action label.** A verb, 1–2 words. "Undo", "Retry", "View".
- **Avoid "Oops"**, "Whoops", "Uh oh." State what happened: "Couldn't
  save changes. Retry?"
- **Don't expose stack traces or error codes** in the message — those
  go in the linked error detail.

---

## 8. AI implementation instructions

1. **Import (once shipped).**
   ```tsx
   import { toast, ToastHost } from "@famm/ui";
   ```
2. **Mount `<ToastHost />` exactly once** in
   `apps/web/src/app/layout.tsx`. Don't add a second host.
3. **Trigger toasts imperatively:**
   ```tsx
   toast.success("Workout saved.");
   toast.error("Couldn't reach the server. Retrying…", { duration: 10_000 });
   toast.info("You're back online.");
   toast.warning("Session expires in 5 minutes.");
   ```
4. **Never write `<div className="fixed top-4 right-4 ...">`** as a
   toast. Use the API.
5. **No two-action toasts.** If you need two actions, you need a Modal.
6. **Don't toast for form validation.** Errors belong on the field.
7. **Don't toast for destructive confirmations.** Confirmations belong
   in a Modal.
8. **Pick the tone by meaning:**
   - Completed positive action → `success`.
   - Informational (no action needed) → `info`.
   - Caution (no immediate action) → `warning`.
   - Failed background operation → `danger`.
9. **For ongoing failures**, pass `duration: Infinity` and always
   leave `dismissible: true` so the user can close it once resolved.
10. **No HTML / JSX in the message string** — text only.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Toast
Component set name:  Toast
Variant axes:
  tone:   info | success | warning | danger
  size:   sm | md
  action: none | one
  state:  entering | visible | paused | dismissing
Sub-frames:
  Toast / Stack          (host with 1, 2, 3 toasts)
  Toast / Mobile         (top-of-viewport rendering on <sm)
  Toast / WithAction     (md variant with trailing button)
```

Tokens used (semantic only): `color.surface.raised`,
`color.text.primary`, `color.text.muted`, `color.signal.info`,
`color.signal.success`, `color.signal.warning`, `color.signal.danger`,
`color.border.subtle`, `radius.card`, `elevation.toast`,
`space.inset.md`, `space.inline.sm`, `motion.role.enter`,
`motion.role.exit`.

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/toast.tsx
Exports:  Toast, ToastHost, toast (imperative API), ToastProps
Import:   import { toast, ToastHost } from "@famm/ui";
Tier:     L1 primitive (component) + L2 host (mount point)
```

File name `toast.tsx`. The imperative API lives as a stable singleton
exported alongside the component — feature code never instantiates a
toast manager. No `Snackbar`, `Notification`, `Alert`, or
feature-prefixed toast components exist anywhere else in the monorepo.
`Alert` is reserved for the future inline (non-transient) alert
primitive and is a different component.
