# CLAUDE.md — repo guide for Claude Code

This file is the entry point for AI assistants working in this repository.
Source of truth for the design system is `docs/DESIGN_SYSTEM.md` — when in
doubt, defer to it.

## Repo shape

- Turborepo monorepo. Node + TypeScript throughout.
- `apps/web` — Next.js 14 app (the product surface). Tailwind CSS.
- `apps/api` — backend service.
- `packages/ui` — `@famm/ui`: the design system package.
  - `src/tokens/` — semantic design tokens (json + css + ts).
  - `src/components/primitives/` — **L1**. Stable, semver-tracked. Buttons,
    inputs, cards, etc.
  - `src/components/patterns/` — **L2**. Composites built from L1 + tokens.
  - `src/hooks/` — `useReducedMotion`, future a11y helpers.
- `packages/{auth,db,shared,types,events,payments,ai,config}` — backend
  and shared.
- `docs/` — architecture, product, and design-system documentation.

## Before you write JSX (do this every time)

1. **Search `packages/ui/src/components/primitives` and `…/patterns`** for an
   existing component that does what you need. Reuse > extend > create.
2. **If you must add a variant**, extend the existing `cva()` definition in
   the primitive — do not fork into a new component.
3. **If you must create a new component**, place it according to its tier:
   - Reused across features? → `packages/ui/src/components/patterns/` (L2).
   - Feature-specific one-off? → `apps/web/src/components/<feature>/` (L3).
   - New atom? → DS-owner approval required before adding to primitives.
4. **Use semantic Tailwind classes only.** Allowed color families:
   `surface-*`, `text-*`, `accent-*`, `signal-*`, `border-*`. Allowed
   spacing: `p-inset-*`, `gap-stack-*`, `gap-inline-*`. Allowed radii:
   `rounded-control`, `rounded-card`, `rounded-pill`.
5. **No raw values.** No hex codes, no `px`, no `rgb()`, no inline `style={}`
   outside L1 primitives. ESLint will fail your PR.
6. **Accessibility is non-negotiable.** Every interactive element gets a
   visible focus ring, an accessible name, and a 44×44 touch target on
   touch viewports. Forms wrap inputs in `FormField` once that lands.
7. **Respect `prefers-reduced-motion`.** Use `useReducedMotion()` from
   `@famm/ui` to gate any non-decorative animation.

## What not to do

- Don't add a new component library (shadcn-fork, MUI, Mantine) — wrap the
  one we have or extend primitives.
- Don't add a new icon set — we use `lucide-react` already.
- Don't hand-edit `packages/ui/src/tokens/tokens.json` without a linked
  design ticket. Once the Figma export pipeline is wired up (see strategy
  §4.2) this file is generated.
- Don't create planning/decision/summary `.md` files in the repo — keep
  work in the conversation and the PR description.
- Don't bypass hooks (`--no-verify`) or skip the lint/typecheck/test
  gates.

## How to run things

```sh
# from the repo root
npm install
npm run dev      # turbo runs all apps in dev
npm run lint     # turbo runs lint across packages
npm run typecheck
npm run test
```

## PR checklist for UI changes

Copy this into the PR body — reviewers expect it:

```
- [ ] No raw color/space/radius values introduced
- [ ] Reused existing L1/L2 components where applicable
- [ ] New/changed components have Figma counterparts linked
- [ ] A11y: keyboard, focus, contrast, reduced-motion verified
- [ ] Responsive: verified at sm / md / lg
- [ ] Screenshots: light + dark, mobile + desktop
- [ ] Figma link: <url>
```

## Pointers

- Design system strategy: `docs/DESIGN_SYSTEM.md`
- Tokens: `packages/ui/src/tokens/tokens.json` (source) + `tokens.css` (CSS
  vars consumed by the app) + `tokens.ts` (typed consts).
- Tailwind theme: `packages/ui/tailwind.config.ts`.
- ESLint enforcement: `packages/config/eslint/design-system.js`.
- Architecture, payments, auth, slot generation, etc.: see `docs/`.
