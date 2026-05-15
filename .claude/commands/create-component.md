---
description: Create a reusable UI component aligned to the FAMM design system
argument-hint: <component-name> [tier]
---

# /create-component

Create a new reusable UI component named `$ARGUMENTS` (the first
argument is the component name in PascalCase; the optional second
argument is the tier: `primitive` / `pattern` / `feature`, defaulting
to `primitive`).

This command is structured. **Do not skip steps.** Skipping the
"check whether the component already exists" step is the most common
way new components drift into the codebase.

---

## Step 1 — Read the design system (do this first, always)

Before writing any code:

1. **Principles.** Read `docs/DESIGN_SYSTEM.md` end to end (it is the
   strategy doc — note the five core principles and the three-tier
   governance model). If a `docs/design-system/principles.md` file
   exists, read it too; otherwise rely on `DESIGN_SYSTEM.md §2`.
2. **Tokens.** Read `docs/FIGMA_VARIABLES.md` for naming, and look at
   the actual generated token files in
   `packages/ui/src/tokens/`. Note which semantic tokens already
   exist for color, spacing, typography, radius, shadow, motion.
   You will use semantic tokens only.
3. **Related component docs.** Look in
   `docs/design-system/components/` for components that are
   semantically related to the one you're building (e.g. for a
   `Switch`, read `checkbox.md` and `radio.md`). For an L2 pattern,
   also read `docs/FIGMA_COMPONENT_TEMPLATE.md`.
4. **Existing patterns.** Inspect
   `packages/ui/src/components/primitives/` and
   `packages/ui/src/components/patterns/` for the code style: how
   `cva()` is used, how primitives compose, how the file is named
   (lowercase-kebab), how the props interface is exported.

## Step 2 — Check whether the component already exists

Hard requirement. Before writing a line of code:

- Grep `packages/ui/src/components/` for the component name and any
  obvious aliases.
- Grep `apps/web/src/components/` for one-off versions (a candidate
  for promotion rather than re-creation).
- Open `docs/design-system/components/` — if a spec exists, the
  component is either shipped or planned. Either way, follow the
  spec.
- If the component exists in code, do **not** create a new one. Stop
  and tell the user; offer to extend the existing component via its
  `cva()` definition or compound API.
- If the component exists as a doc but not as code, this command is
  the right next step — make sure your implementation matches the
  documented variants, states, and tokens exactly.

If you decide to proceed, restate to the user:

- The component name.
- The tier (primitive / pattern / feature).
- The file path you'll create.
- The variants, sizes, and states you plan to support, and which doc
  they come from.
- Any new tokens you'll need (rare — extending tokens has its own
  process).

## Step 3 — Implement

Follow the codebase's conventions:

- **Path.**
  - `primitive` → `packages/ui/src/components/primitives/<name>.tsx`
    (lowercase-kebab).
  - `pattern` → `packages/ui/src/components/patterns/<name>.tsx`.
  - `feature` → `apps/web/src/components/<feature>/<name>.tsx`.
- **Library.** `class-variance-authority` for variant axes, `cn` from
  `packages/ui/src/lib/utils.ts` for class merging.
- **Tokens only.** Use the allowed semantic Tailwind families:
  `bg-surface-*`, `text-text-*`, `bg-accent-*`, `bg-signal-*`,
  `border-border-*`, `p-inset-*`, `gap-stack-*`, `gap-inline-*`,
  `rounded-control` / `rounded-card` / `rounded-pill`. No raw
  colors, no `px`, no `style={}`.
- **Forward refs** where the component renders a DOM node.
- **Display name.** Set `<Component>.displayName = "<Component>"`.

## Step 4 — Deliverables (deliver every one)

The completed task includes:

1. **Component file** at the correct path, following the conventions
   above.
2. **Types / props interface.** Exported with a `<Name>Props` name.
   Use `VariantProps<typeof <name>Variants>` to derive variant types
   from `cva()` automatically.
3. **Variants.** Implemented exactly as documented in
   `docs/design-system/components/<name>.md`. Do not add or rename
   variants without updating the doc in the same change.
4. **States.** Cover every state the doc lists — at minimum
   `default`, `hover`, `focus-visible`, `active`, `disabled`,
   `loading` / `error` if interactive. Focus ring uses
   `color.border.focus`; never `outline: none` without a replacement.
5. **Responsive behavior.** Implemented per the doc — usually
   container-driven; flag explicitly if a `sm:` / `md:` / `lg:`
   utility is needed.
6. **Accessibility support.** Required ARIA, correct semantic
   element, keyboard interactions, 44×44 touch target on touch
   viewports, accessible-name contract documented in JSDoc.
7. **Example usage.** Add a Storybook story at
   `packages/ui/src/components/<tier>/<name>.stories.tsx` showing
   every variant × size combination and the standard states.
8. **Documentation update.** Update
   `docs/design-system/components/<name>.md` (or create it if it
   doesn't exist using `docs/FIGMA_COMPONENT_TEMPLATE.md` §1 as the
   template). Mark status `🟢 Stable` once the PR is ready.
9. **Notes for Figma alignment.** At the bottom of the PR description
   (or in a `Figma alignment` section of the docs change), list:
   - The Figma component-set name that must match
     (`Category/Component`).
   - The variant axes and values that must match (same names, same
     case).
   - The tokens consumed.
   - Any breaking changes that require the Figma side to be updated
     in the same release.

## Step 5 — Verify

Before reporting complete:

- `npm run lint` passes (ESLint catches token violations).
- `npm run typecheck` passes.
- `npm run test` passes; new component has at least one test covering
  the default render and the accessible-name contract.
- Story renders in Storybook with no console errors.

## Do not

- Do not skip Step 2 (the "does it exist?" check). Ever.
- Do not import a third-party UI library directly into product code.
  Wrap in L1 first if it must be used.
- Do not introduce new tokens silently. New tokens require a
  Figma-Variables change and a regenerated `tokens.json` — flag it
  to the user and stop.
- Do not commit code that violates the design-system ESLint rules
  ("just for this case").
- Do not add an emoji, illustration, or copy that isn't in the spec.
- Do not extend tokens beyond the closed semantic families. If a
  spec demands a new family, propose it; don't invent one.
