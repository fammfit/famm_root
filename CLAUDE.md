# CLAUDE.md — repo guide for Claude Code

This file is the entry point for AI assistants working in this repository.

- **Strategy** (one-pager governance): `docs/DESIGN_SYSTEM.md`.
- **Day-to-day rules** (principles, ux, a11y, responsive, motion, content):
  the `design-system/` folder.
- **AI-facing rule files** (auto-applied): `.cursor/rules/00..05-*.mdc`.

When in doubt, defer to the docs above.

## Repo shape

- Turborepo monorepo. Node + TypeScript throughout.
- `apps/web` — Next.js 14 app (the product surface). Tailwind CSS.
- `apps/api` — backend service.
- `packages/ui` — `@famm/ui`: the design system code package.
  - `src/tokens/` — semantic tokens (json source + generated css + ts).
  - `src/components/primitives/` — **L1**. Stable, semver-tracked.
  - `src/components/patterns/` — **L2**. Composites built from L1 + tokens.
  - `src/hooks/` — `useReducedMotion`, future a11y helpers.
- `packages/{auth,db,shared,types,events,payments,ai,config}` — backend
  and shared.
- `design-system/` — DS documentation surface (principles, rules,
  contracts, changelog).
- `docs/` — architecture, product, system strategy.

## Before you write JSX (do this every time)

1. **Search `packages/ui/src/components/{primitives,patterns}`** for an
   existing component that does what you need. Reuse > extend > create.
2. **If you must add a variant**, extend the existing `cva()` definition
   in the primitive — do not fork.
3. **If you must create a new component**, place it according to its tier:
   - Reused across features? → `packages/ui/src/components/patterns/` (L2).
   - Feature-specific one-off? → `apps/web/src/components/<feature>/` (L3).
   - New atom? → **stop and ask**; L1 needs DS-owner approval.
4. **Semantic Tailwind only.** Allowed color families: `surface*`,
   `text-*`, `accent*`, `signal-*`, `border*`. Allowed spacing:
   `p-inset-*`, `gap-stack-*`, `gap-inline-*`. Allowed radii:
   `rounded-control`, `rounded-card`, `rounded-pill`.
5. **No raw values.** No hex, no `px`, no `rgb()`/`hsl()`, no inline
   `style={}` outside L1 primitives. ESLint will fail your PR.
6. **No Tailwind default palette in new code.** `bg-gray-*`, `text-red-*`,
   `border-gray-*` are out. Use semantic tokens.
7. **A11y is non-negotiable.** Every interactive element gets a visible
   focus ring, an accessible name, and a 44×44 touch target on touch
   viewports. Forms wrap inputs in `FormField`.
8. **Respect `prefers-reduced-motion`.** Use `useReducedMotion()` from
   `@famm/ui` for any animation > 200ms or involving translation.

## What not to do

- Don't add a new component library (shadcn-fork, MUI, Mantine).
- Don't add a new icon set — we use `lucide-react`.
- Don't hand-edit `packages/ui/src/tokens/tokens.css` or `tokens.ts`.
  They are generated. Run `npm run tokens:generate` after changing
  `tokens.json`.
- Don't create planning/decision/summary `.md` files in the repo — keep
  work in the conversation and PR description.
- Don't bypass hooks (`--no-verify`) or skip lint/typecheck/test gates.

## Slash commands

These commands live in `.claude/commands/` and are invokable as
`/<name>`:

- `/audit-ui <path|feature>` — drift audit, no modifications.
- `/create-component <Name> [purpose]` — guided creation at the correct
  tier.
- `/refactor-component <path>` — migrate an existing component to
  semantic tokens & conventions.
- `/review-accessibility <path|diff>` — WCAG 2.2 AA review, report only.

## How to run things

```sh
# from the repo root
npm install
npm run dev               # turbo runs all apps in dev
npm run lint
npm run typecheck
npm run test
npm run tokens:generate   # regenerate tokens.css and tokens.ts from tokens.json
npm run tokens:check      # CI mode — fail if outputs are stale
```

## PR checklist for UI changes

Reviewers expect this on every UI PR — copy into the PR body:

```
- [ ] No raw color/space/radius values introduced
- [ ] No Tailwind default palette in new code
- [ ] Reused existing L1/L2 components where applicable
- [ ] New/changed components have Figma counterparts linked
- [ ] A11y: keyboard, focus, contrast, reduced-motion verified
- [ ] Responsive: verified at sm / md / lg
- [ ] Screenshots: light + dark, mobile + desktop
- [ ] Figma link: <url>
```

## Pointers

- Strategy: `docs/DESIGN_SYSTEM.md`
- Principles: `design-system/principles.md`
- UX rules: `design-system/ux-rules.md`
- Accessibility: `design-system/accessibility.md`
- Responsive: `design-system/responsive.md`
- Motion: `design-system/motion.md`
- Content: `design-system/content-guidelines.md`
- Tokens: `packages/ui/src/tokens/tokens.json` (source).
- Tailwind theme: `packages/ui/tailwind.config.ts`.
- ESLint enforcement: `packages/config/eslint/design-system.js`.
- Architecture, payments, auth, slot generation: see `docs/`.
