# Button

Status: 🟢 Stable. L1 primitive. Owned by the design-system owner.

The Button is the canonical action trigger in the FAMM product. Every CTA
in `apps/web` resolves to this component — there is no other approved way
to render a clickable, action-shaped element. One-off CTA styling (a
fresh `<button>` with raw Tailwind, a bespoke `<a>` made to look like a
button, a copied-and-tweaked card) is a CI failure, not a stylistic
choice.

If `Button` can't express what you need, **the Button gets extended** —
the app does not invent.

---

## 1. Purpose

`Button` triggers a single, discrete action on the current surface. It is
the primary way a user commits to or cancels an intent: log a set,
confirm a payment, advance a wizard, dismiss a sheet.

The component encapsulates:

- the visual ladder of action emphasis (primary / secondary / ghost /
  destructive / link),
- the size scale and the WCAG 2.2 touch-target floor,
- focus, hover, active, disabled, and loading states,
- the motion contract and its reduced-motion fallback,
- the contrast-guaranteed token pairings.

Consumers compose `Button` into flows; they never restyle it.

---

## 2. Variants

The variant axis matches `ButtonProps["variant"]` in
`packages/ui/src/components/primitives/button.tsx`.

| Variant       | Use for                                            | Visual emphasis |
|---------------|----------------------------------------------------|-----------------|
| `default`     | The single primary action on a surface (the "commit") | High — accent fill |
| `secondary`   | Supporting actions next to a primary               | Medium — neutral fill |
| `outline`     | Calm alternative to `secondary` when on a busy surface | Medium — border only |
| `ghost`       | Tertiary actions in toolbars, table rows, popovers | Low — transparent until hover |
| `link`        | Inline navigational triggers that look like text   | Lowest — underlined accent |
| `destructive` | Irreversible or data-removing actions, always behind a confirmation | High — danger fill |

Rules:

- **One `default` per surface.** If a screen has two primary buttons,
  one is wrong — promote it to its own surface or demote it to
  `secondary`.
- `destructive` is never the standalone action on the page. It pairs
  with a `secondary` or `outline` "Cancel" inside a Dialog.
- `link` looks like text, but is still a `<button>`. For route
  navigation, use `Link`, not `Button variant="link"`.

Forbidden combinations:

- `variant="destructive"` + `size="sm"` — destructive actions must be at
  least `md` to satisfy reach and confidence.
- `variant="link"` + `size="icon"` — semantically meaningless; use
  `IconButton` (when shipped) or `ghost`.

To **add a variant**: extend the `cva()` block in
`packages/ui/src/components/primitives/button.tsx`. Do not create a new
component, do not fork the file, do not override via `className` at the
call site.

---

## 3. Sizes

The size axis matches `ButtonProps["size"]`.

| Size   | Height | Padding token       | Typical use                                |
|--------|--------|---------------------|--------------------------------------------|
| `sm`   | 32px   | `space.inset.sm`    | Inline actions in dense tables and toolbars |
| `md`   | 40px   | `space.inset.md`    | Default. Forms, dialogs, page actions       |
| `lg`   | 48px   | `space.inset.lg`    | Hero CTAs, full-width mobile actions        |
| `icon` | 44px   | square              | Icon-only actions (44×44 touch floor)       |

Rules:

- `md` is the default — never pass `size="md"` explicitly.
- On touch viewports, `sm` is only legal inside containers that keep the
  hit target at 44×44 via surrounding padding. When in doubt, use `md`.
- `icon` always carries an `aria-label`. An icon-only button without an
  accessible name fails review and CI.
- Don't override height with `className`. If a new height is needed, add
  a size token and extend the variant.

---

## 4. States

The component renders the following states. Visual specs live in Figma
(`Components / Button`); behavior is enforced in code.

| State            | Triggered by                              | Notes |
|------------------|-------------------------------------------|-------|
| `default`        | Idle                                      | Resting visual |
| `hover`          | Pointer over (pointer devices only)       | Uses `motion.role.hover` |
| `focus-visible`  | Keyboard focus                            | 2px ring via `color.border.focus` |
| `active`         | Pressed                                   | Uses `motion.role.press` |
| `disabled`       | `disabled` prop or `loading=true`         | `pointer-events: none`, 50% opacity |
| `loading`        | `loading` prop                            | Spinner replaces space before label; `aria-busy="true"`; `disabled` automatically applied |

Notes:

- `loading` and `disabled` interact: `loading=true` forces `disabled`
  even if the consumer didn't pass it. The label remains visible — the
  spinner sits to its left.
- There is no `error` state on the Button itself. Surface errors next to
  the form or via Toast; do not flash the button.
- Never remove the focus ring. `outline: none` without a replacement is a
  blocking review comment.

---

## 5. Usage rules

The rules that keep Button the only path for actions:

1. **Always import from `@famm/ui`.** Never deep-import from
   `packages/ui/src/...`, and never re-export a wrapper called `Button`
   inside a feature folder.
2. **No raw `<button>` in `apps/web` for CTA-shaped elements.** A
   `<button>` is allowed for low-level mechanics (toggling local state in
   a custom L2 pattern), never as a styled action surface in product UI.
3. **No `className` overrides for color, padding, radius, or height.**
   All visuals come from props. If a prop doesn't exist, the variant
   doesn't exist — open a PR to add it.
4. **One primary action per surface.** Hierarchy is enforced by the
   variant choice, not by visual tweaks.
5. **For navigation, reach for `Link`.** A Button that routes is a code
   smell unless the action also mutates server state (e.g. "Start
   workout" both creates a session and navigates).
6. **Compose, don't fork.** Need a button with a leading icon? Render an
   `Icon` as the first child. Need a destructive confirmation? Pair
   `variant="destructive"` with a `Dialog`. Need a split button? Open a
   ticket — it's a new primitive.
7. **No bespoke loading indicators.** Use `loading={isPending}` and let
   the component own the spinner.

---

## 6. Accessibility requirements

Baseline is WCAG 2.2 AA, per `docs/DESIGN_SYSTEM.md §5`. Concretely:

- **Element.** Renders `<button type="button">` by default. There is no
  `as` escape hatch — for links, use `Link`.
- **Accessible name.**
  - Text-bearing buttons get their name from `children`.
  - `size="icon"` buttons **must** pass `aria-label`. CI lint rule
    flags icon buttons without one.
  - Buttons with both icon and text use the text as the accessible name;
    the icon carries `aria-hidden="true"`.
- **Keyboard.**
  - `Enter` and `Space` activate.
  - Tab order follows DOM order; the component does not manipulate
    `tabIndex`.
  - When `disabled`, the button is unfocusable and unactivatable.
- **Focus.** `focus-visible` ring is 2px solid on
  `color.border.focus`, with a 2px offset against
  `color.surface.default`. The ring is preserved on every variant —
  including `ghost` and `link`.
- **Loading.** `aria-busy="true"` is set automatically when
  `loading=true`. Consumers should also update an associated live region
  (form status, toast) so the change is announced; the button itself
  does not announce.
- **Motion.** Hover and press use `motion.role.hover` /
  `motion.role.press`. Both collapse to instant under
  `prefers-reduced-motion: reduce`, via `useReducedMotion()` from
  `@famm/ui`. Do not write a media query at the call site.
- **Touch target.** Minimum 44×44 enforced by `size="icon"` and by the
  `md` / `lg` heights. `sm` is exempt only inside containers that
  preserve 44×44 via outer padding (toolbars, table rows). When in
  doubt, use `md`.
- **Contrast.** Tokens are pre-validated:
  - `color.text.on-accent` on `color.action.primary` ≥ 4.5:1.
  - `color.text.primary` on `color.surface.default` ≥ 7:1.
  - Disabled (50% opacity) is not held to AA — disabled controls are
    exempt under WCAG 1.4.3, but the underlying tokens still pass.

---

## 7. Content rules

The label is the most important pixel on the button. Treat it as copy,
not decoration.

- **Verb-first.** "Save changes", "Log set", "Cancel booking". Not
  "Submit", not "OK".
- **Sentence case.** "Add to plan", not "Add To Plan".
- **1–3 words.** If the label needs more, the action is two actions, or
  the surrounding copy is doing the wrong job.
- **No emoji.** Use the icon slot (`Icon` as first or last child).
- **No trailing punctuation** ("Save changes" not "Save changes!"),
  except the ellipsis `…` for actions that open further UI ("Add
  exercise…").
- **Pluralization is real copy.** "Delete 1 set" / "Delete 3 sets" — not
  "Delete set(s)".
- **`loading` does not change the label.** Keep "Save changes" visible
  with the spinner. Never replace with "Loading…".
- **Numeric labels** stay in the default font role; only stat values use
  `font.role.mono`.
- **Internationalization.** Labels are passed via children — never
  hard-coded into the component. Plan for ~30% width growth in German;
  do not lay out so a button overflows on a long string.

---

## 8. Responsive behavior

Button itself is breakpoint-agnostic — height, padding, and font come
from the chosen `size`, not from the viewport. The container governs
layout.

| Breakpoint | Expectation                                                                                  |
|------------|----------------------------------------------------------------------------------------------|
| `sm` (<640px)  | In mobile sheets, primary actions are full-width via the parent (`w-full`). The Button does not auto-stretch. |
| `md` (≥768px)  | Buttons are content-width unless the layout grid says otherwise.                             |
| `lg` (≥1024px) | Same as `md`. Toolbars favor `size="sm"`; page actions favor `size="md"`.                    |
| `xl` (≥1280px) | Same as `lg`. `size="lg"` is reserved for marketing hero surfaces.                           |

Rules:

- Make a button full-width by wrapping it in a full-width container with
  `flex` or by passing `className="w-full"` — `w-full` is the **only**
  width override allowed on Button.
- Don't switch `size` based on breakpoint. The `size` reflects role
  (toolbar vs hero), not screen width.
- Touch target is 44×44 at every breakpoint. The component enforces
  this; the consumer cannot opt out.

---

## 9. Do and don't

### ✅ Do

```tsx
import { Button } from "@famm/ui";
import { Plus } from "lucide-react";

// Primary action with a leading icon
<Button onClick={onAddSet}>
  <Plus aria-hidden="true" className="mr-inline-xs h-4 w-4" />
  Log set
</Button>

// Loading state — label stays visible
<Button loading={isPending} onClick={handleSave}>
  Save changes
</Button>

// Destructive action inside a dialog, paired with a cancel
<Dialog>
  <Button variant="outline" onClick={close}>Cancel</Button>
  <Button variant="destructive" onClick={confirm}>Delete workout</Button>
</Dialog>

// Icon-only action with an accessible name
<Button size="icon" aria-label="Close dialog" onClick={close}>
  <X aria-hidden="true" className="h-4 w-4" />
</Button>

// Full-width on mobile sheet — only width override allowed
<Button className="w-full" onClick={onSubmit}>
  Confirm booking
</Button>
```

### ❌ Don't

```tsx
// One-off CTA styling — banned. ESLint catches the raw bg-* class.
<button className="bg-blue-600 px-4 py-2 rounded text-white">
  Save
</button>

// Forking a Button into a feature folder to add a variant.
// apps/web/src/components/booking/CelebrationButton.tsx ❌
// → Extend cva() in primitives/button.tsx instead.

// Color override via className.
<Button className="bg-purple-500 text-white">Pay</Button>

// Two primary actions on the same surface.
<Button>Save</Button>
<Button>Publish</Button> {/* one of these must be variant="secondary" */}

// Destructive without confirmation.
<Button variant="destructive" onClick={deleteAccount}>
  Delete account
</Button>
{/* Wrap in a Dialog with a Cancel sibling. */}

// "Loading…" replacement label.
<Button loading={isPending}>
  {isPending ? "Loading…" : "Save changes"} {/* ❌ — just pass loading */}
</Button>

// Removing the focus ring.
<Button className="focus-visible:ring-0">Submit</Button>

// Using Button to navigate between routes.
<Button onClick={() => router.push("/profile")}>Profile</Button>
{/* Use <Link>. */}

// Icon-only without an accessible name.
<Button size="icon"><X /></Button>

// Title case label.
<Button>Save Changes And Continue</Button>
```

---

## 10. AI implementation instructions

Read these top-to-bottom before generating any JSX that contains an
action.

1. **Import is fixed.** `import { Button } from "@famm/ui";`. Never
   deep-import. Never wrap-and-rename in a feature folder.
2. **Search before you write.** If you're about to type
   `<button className=`, stop. The right primitive already exists.
3. **Adding a variant.** Open
   `packages/ui/src/components/primitives/button.tsx` and extend the
   `cva()` block. The new variant appears in the prop type
   automatically — do not maintain a parallel type. Do not create a new
   component named `Button2`, `PrimaryButton`, `BrandButton`, etc.
4. **No `className` for visuals.** The only `className` value Button
   accepts in product code is `w-full`. Anything else (`bg-*`, `text-*`,
   `p-*`, `rounded-*`, `h-*`, `border-*`) is a review failure and is
   caught by the design-system ESLint config.
5. **Variant choice is by role, not by color.**
   - Commit / save / submit → `default`.
   - Supporting / "Back" → `secondary` (or `outline` on busy surfaces).
   - Tertiary in dense UI → `ghost`.
   - Irreversible → `destructive`, inside a Dialog.
   - Inline text-like trigger → `link`.
6. **Sizes.**
   - Default is `md`; omit the prop.
   - Tables/toolbars → `sm`, only inside containers preserving 44×44.
   - Hero / marketing → `lg`.
   - Icon-only → `size="icon"` + `aria-label` (mandatory).
7. **Icons.** Use `lucide-react`. Pass the icon as a child JSX element
   with `aria-hidden="true"` and an explicit size (`h-4 w-4`). Do not
   pass the icon as a function reference; do not invent a `leadingIcon`
   prop — it doesn't exist on this Button.
8. **Loading.** Drive with `loading={isPending}`. Do not toggle
   `disabled` yourself when `loading` is true — Button does it. Do not
   swap the label for "Loading…". Do not add your own spinner.
9. **Disabled is for impossible, not for "I'm thinking."** If an action
   is in flight, use `loading`. If a precondition isn't met, use
   `disabled` and explain why next to the button or via tooltip.
10. **Navigation is not an action.** If `onClick` only calls
    `router.push`, the right component is `Link`, not `Button`.
11. **Accessibility is not optional.**
    - Icon-only → `aria-label`.
    - Decorative icons in labeled buttons → `aria-hidden="true"`.
    - Never write `outline: none`, `focus:ring-0`, or remove
      `focus-visible:*` classes.
12. **Motion.** Don't add `transition-*` or `animate-*` classes at the
    call site. Button owns its own animations and respects
    `useReducedMotion()`.
13. **Width.** Full-width via `className="w-full"` on the Button or
    `flex` on the parent. Nothing else.
14. **Forms.** Inside a `<form>`, a submitting Button is
    `<Button type="submit">`. The default `type` is `button`, which
    deliberately prevents accidental form submission.

When uncertain whether to use Button, the answer is yes. When uncertain
whether to extend it, open an issue rather than fork.

---

## 11. Expected code component path

```
Source:     packages/ui/src/components/primitives/button.tsx
Export:     export { Button, buttonVariants } from "@famm/ui";
Tier:       L1 primitive
Tests:      packages/ui/src/components/primitives/__tests__/button.test.tsx
Storybook:  packages/ui/src/components/primitives/button.stories.tsx
```

The Button is the only file that may define button visuals. Anywhere
else in the monorepo, a `button.tsx` or `Button.tsx` that styles itself
is a bug — either delete it and use `@famm/ui`, or, if it has a genuine
new shape, propose promotion through the tier system in
`DESIGN_SYSTEM.md §3`.

---

## 12. Figma component naming convention

In the **FAMM Design System** Figma library, on the `07 — Components`
page:

```
Section frame:       Button
Component set name:  Button
Variant axes:
  variant: default | secondary | outline | ghost | link | destructive
  size:    sm | md | lg | icon
  state:   default | hover | focus-visible | active | disabled | loading
```

Rules (per `docs/FIGMA_GUIDE.md §7` and `docs/FIGMA_VARIABLES.md`):

- Axis names and values match the React props exactly. Case matters for
  diff review — lowercase variant values, hyphenated states.
- Forbidden combinations (`destructive` + `sm`, `link` + `icon`) are
  marked with the 🪦 prefix on those specific frame thumbnails and are
  not published.
- The component set's frame description carries the documentation block
  defined in `docs/FIGMA_COMPONENT_TEMPLATE.md` — `Component Name`
  through `AI implementation notes`.
- Token dependencies on the Figma side reference the semantic variables
  only: `color.action.primary`, `color.text.on-accent`,
  `space.inset.md`, `radius.control`, `motion.role.hover`,
  `color.border.focus`. No primitive variables appear in the Button
  spec.
- Status emoji on the section frame is `🟢` for the shipped variants; a
  new variant under review carries `🟡` until the PR adding it to
  `cva()` merges.
- Deprecating a variant: rename the Figma variant to
  `🪦 <oldname>` and add a redirect note in the frame description
  pointing to the replacement. Removed one minor release later.
