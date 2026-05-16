# FAMM Fitness — Figma Component Documentation Template

Status: Living document. Companion to `docs/DESIGN_SYSTEM.md`,
`docs/FIGMA_GUIDE.md`, and `docs/FIGMA_VARIABLES.md`.

Every component on the Components (L1) and Patterns (L2) pages of the
**FAMM Design System** Figma library carries the documentation block
below — pasted into the Figma frame description, mirrored in the
component's Storybook story, and reviewed at promotion time.

L3 templates use a lighter variant (see §3).

---

## 1. The template

Copy this block verbatim into a new component's frame description. Every
field is required unless explicitly marked optional. "N/A" is a valid
answer when justified — `—` is not.

```
Component Name:
Purpose:
When to use:
When not to use:
Variants:
States:
Responsive behavior:
Accessibility notes:
Content rules:
Related code component:
GitHub file path:
Design token dependencies:
Known limitations:
AI implementation notes:
```

---

## 2. Field-by-field guidance

Brief rules for what each field must contain. Treat this as the rubric a
reviewer applies at promotion (`DESIGN_SYSTEM.md §3`).

### Component Name
The canonical name in **PascalCase**, matching the React export and the
Figma component-set name. One name, one component. No `v2`, no `New`, no
project-codename prefixes. Example: `Button`, `StatCard`, `FormField`.

### Purpose
One sentence (≤ 25 words) stating what role the component fills, written
in terms of the user's intent, not the visual shape. "Surfaces a single
metric with optional context and trend" beats "rounded rectangle with a
big number and a small label."

### When to use
2–4 bullets describing concrete situations. Anchor to product surfaces
where possible ("on the workout summary page to show set count"). Avoid
"any time you need a button" — that's not guidance.

### When not to use
2–4 bullets calling out the wrong reach. Name the alternative for each.
"Don't use `Button` for navigation between routes — use `Link`." This is
the field that prevents drift; do not skip it.

### Variants
Enumerate the variant axes that exist in the component set. One axis per
line, each with allowed values. Names match the React prop:

```
variant: primary | secondary | ghost | danger
size:    sm | md | lg
tone:    neutral | accent
```

If a combination is illegal (e.g. `variant=ghost` + `tone=accent`), say so
explicitly under a `Forbidden combinations:` sub-bullet.

### States
The set of interaction states the component renders. For every
interactive component the minimum set is:

```
default, hover, focus-visible, active, disabled, loading, error
```

Note any state the component does **not** support and why. If a state
requires consumer wiring (e.g. `loading` needs an `isLoading` prop),
mention the prop.

### Responsive behavior
What the component does at each Tailwind breakpoint (`sm / md / lg / xl`).
One line per breakpoint, only if behavior changes. Cover: layout shifts,
text truncation, density changes, hidden affordances on small viewports,
touch-target adjustments. If the component is breakpoint-agnostic, write
"Identical across breakpoints; container governs layout" and be done.

### Accessibility notes
A short list, in this order:

1. **Role / semantic element.** What `role` it carries or which HTML
   element it renders (`<button>`, `<a>`, `<dialog>`).
2. **Accessible name.** Where it comes from — children, `aria-label`, an
   associated `<label>`. Required vs optional.
3. **Keyboard interactions.** The keys it responds to and what they do
   (`Enter` / `Space` activate, arrows navigate, `Esc` closes).
4. **Focus management.** Owns focus ring via `color.border.focus`. Where
   focus lands on mount / unmount for components that move it.
5. **Motion.** Whether it animates, and the `motion.role.reduced`
   fallback.
6. **Touch target.** Minimum 44×44 enforced via component tokens (per
   `DESIGN_SYSTEM.md §5`).

Anything the consumer must provide (e.g. `aria-describedby` for an error
message) is called out as **Consumer responsibility**.

### Content rules
Copy and content constraints. Examples:

- Label length: 1–3 words; truncates with ellipsis after 24 chars.
- Sentence case, not title case.
- No emoji in labels (icons go in the icon slot).
- Numeric values use `font.role.mono`.
- Pluralization rules ("1 set" vs "3 sets").
- What's allowed inside a `children` slot vs forbidden.

If the component has no content (e.g. a divider), write "No textual
content" — don't leave the field empty.

### Related code component
The exact React export and where it lives, in this form:

```
Import:   import { Button } from "@famm/ui";
Tier:     L1 primitive
Storybook: <URL>
```

Tier is one of `L1 primitive`, `L2 pattern`, `L3 feature` — matching
`DESIGN_SYSTEM.md §3`.

### GitHub file path
The path inside the monorepo, relative to repo root. Always one line, no
backticks needed (Figma renders them literally):

```
packages/ui/src/components/primitives/Button.tsx
```

For L2 patterns: `packages/ui/src/components/patterns/<Pattern>.tsx`.
For L3 features: `apps/web/src/components/<feature>/<Component>.tsx`.

### Design token dependencies
The semantic tokens the component consumes, grouped by family. Use the
exact names from `docs/FIGMA_VARIABLES.md`. Example:

```
Color:   color.action.primary, color.action.primary-hover,
         color.text.on-accent, color.border.focus
Spacing: space.inset.sm (size=sm), space.inset.md (size=md)
Radius:  radius.control
Type:    font.role.label
Motion:  motion.role.hover, motion.role.press
```

If a primitive is referenced directly (rare and only legal inside L1),
flag it with `(primitive)` and an explanation.

### Known limitations
Honest constraints. Things that don't work yet, edge cases that look
wrong, browser quirks, accessibility gaps with a tracking issue. Each
item links to a GitHub issue if one exists. Example:

```
- Long labels in `size=sm` clip vertically on Safari < 16.4 (issue #412).
- No RTL layout support yet — pending tokens for `space.inline` mirror.
- `loading` state announces only once; not yet polite-live.
```

If there are no known limitations, write "None known as of YYYY-MM-DD" so
reviewers can date the claim.

### AI implementation notes
Notes specifically for Cursor / Claude Code. This is the field that
prevents AI assistants from re-inventing the component. Cover:

- The **one** correct import (`import { Button } from "@famm/ui"`).
- Prop names and types to copy from the file, not paraphrase.
- Anti-patterns to avoid (raw colors, inline `style={}`, forking into a
  new component to add a variant — extend the `cva()` definition
  instead, per `CLAUDE.md`).
- Composition rules ("compose with `Icon` via the `leadingIcon` prop;
  do not nest a raw `<svg>`").
- The matching Tailwind utilities when overrides are unavoidable.
- The reduced-motion contract if the component animates.

Keep it scannable — bullets, not prose. AI assistants read this top to
bottom before generating JSX.

---

## 3. L3 template variant

L3 templates (Figma "Templates" page; `apps/web/src/components/<feature>`)
use a trimmed block — they're compositions, not contracts:

```
Component Name:
Purpose:
When to use:
Composed of:
Data dependencies:
States:
Responsive behavior:
Accessibility notes:
GitHub file path:
Analytics events:
Known limitations:
AI implementation notes:
```

`Composed of` lists the L1/L2 components used. `Data dependencies`
lists the endpoints, query keys, or props the screen consumes.
`Analytics events` lists the event names the screen emits. Everything
else follows §2.

---

## 4. Worked example — `Button` (L1)

```
Component Name: Button

Purpose: Triggers a single action on the current surface. The primary
way users commit to or cancel an intent.

When to use:
- Submitting a form (workout log, profile edits, payment).
- Confirming a destructive action in a dialog.
- Advancing a wizard step.
- Triggering an in-place async action (start timer, log set).

When not to use:
- Navigating between routes — use `Link`.
- Toggling a binary state — use `Switch` or `ToggleButton`.
- Opening a menu where the trigger and target differ — use `MenuTrigger`.
- Inside a body paragraph as inline emphasis — use `Text` with weight.

Variants:
variant: primary | secondary | ghost | danger
size:    sm | md | lg
tone:    neutral | accent  (only valid for variant=secondary | ghost)
Forbidden combinations:
- variant=primary + tone=neutral (primary is always accent)
- variant=danger + size=sm (danger actions must be at least md)

States:
default, hover, focus-visible, active, disabled, loading, error
- `loading` driven by `isLoading` prop; replaces label with spinner,
  preserves width.
- `error` is a transient flash (≤ 800ms) after a failed action; consumer
  controls via `errorAt` timestamp.

Responsive behavior:
Identical across breakpoints. Container governs whether the button is
block-width (`<sm>` in mobile sheets) or content-width (default).
Touch target is 44×44 regardless of `size`.

Accessibility notes:
- Renders <button type="button"> unless `as="a"` is passed (then <a>).
- Accessible name: children text, or `aria-label` when icon-only.
- Keyboard: Enter and Space activate; disabled blocks both.
- Focus ring: 2px solid color.border.focus, 2px offset; never removed.
- Motion: hover/press use motion.role.hover / motion.role.press; both
  collapse to instant under reduced-motion.
- Touch target enforced by component padding tokens; do not override.

Content rules:
- Label: sentence case, 1–3 words. Verbs preferred ("Save changes",
  "Log set").
- No emoji. Use `leadingIcon` / `trailingIcon` slots with lucide-react.
- Loading replaces label entirely; do not show "Loading…" text.
- Numeric labels (rare) use the default font role, not mono.

Related code component:
Import:    import { Button } from "@famm/ui";
Tier:      L1 primitive
Storybook: https://storybook.famm.fit/?path=/story/primitives-button

GitHub file path:
packages/ui/src/components/primitives/Button.tsx

Design token dependencies:
Color:   color.action.primary, color.action.primary-hover,
         color.action.primary-active, color.action.danger,
         color.text.on-accent, color.text.primary,
         color.border.default, color.border.focus
Spacing: space.inset.sm, space.inset.md, space.inset.lg
Radius:  radius.control
Type:    font.role.label
Motion:  motion.role.hover, motion.role.press, motion.role.reduced

Known limitations:
- `as="a"` does not yet forward `download` attribute (issue #318).
- `loading` spinner not announced to AT beyond aria-busy (tracking #401).
- No icon-only size auto-collapse — caller passes `size="md"` and an
  `aria-label`.

AI implementation notes:
- Import path is exactly `@famm/ui`. Do not deep-import from
  `packages/ui/src/...`.
- To add a new variant, extend the `cva()` config inside Button.tsx —
  do NOT create a new component or copy the file.
- Never pass color, padding, or radius via `className`. All visuals come
  from props. If a prop doesn't exist, the variant doesn't exist yet.
- `leadingIcon` / `trailingIcon` accept a lucide-react component
  reference, not an element. Pass `Plus`, not `<Plus />`.
- For destructive confirmations, pair `variant="danger"` with a Dialog;
  do not invent a red ghost.
- Animations gated by useReducedMotion() from @famm/ui — re-use the
  hook, do not write a media query.
- Tailwind utilities exist for every variant; reach for the prop first,
  the utility only inside L1.
```

---

## 5. Process

- **New component.** Create the Figma frame, paste the template, fill
  every field before opening a PR for the React component. Empty fields
  block review.
- **Promotion (L3 → L2 → L1).** The doc block migrates with the
  component. Re-fill `Tier`, `GitHub file path`, and `AI implementation
  notes`. Other fields carry over.
- **Deprecation.** Add a final line to `Purpose`: `🪦 Deprecated in
  vX.Y — use <replacement>. Removed in vX.(Y+1).` All other fields stay
  intact for the deprecation window (see `FIGMA_VARIABLES.md §10`).
- **Audit cadence.** A11y and limitations are re-checked at each minor
  release; date them in `Known limitations` so staleness is visible.

When in doubt about a field, the answer is in `DESIGN_SYSTEM.md`,
`FIGMA_GUIDE.md`, or `FIGMA_VARIABLES.md` — in that order.
