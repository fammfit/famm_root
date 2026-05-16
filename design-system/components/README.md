# Components (L1 — Primitives)

Per-component contracts for the L1 primitives in
[`../../packages/ui/src/components/primitives/`](../../packages/ui/src/components/primitives/).

Every primitive has a contract file in this folder named
`<component>.md`. The contract is the agreement between design (Figma) and
code (TSX): variant axes, prop names, accessibility behavior, what's
overridable, what isn't.

## Current primitives

| Component | Code | Contract | Status |
|-----------|------|----------|--------|
| Button | `packages/ui/src/components/primitives/button.tsx` | `./button.md` (TODO) | Shipping |
| Card | `packages/ui/src/components/primitives/card.tsx` | `./card.md` (TODO) | Shipping |
| Input | `packages/ui/src/components/primitives/input.tsx` | `./input.md` (TODO) | Shipping |
| Badge | `packages/ui/src/components/primitives/badge.tsx` | `./badge.md` (TODO) | Shipping |
| Spinner | `packages/ui/src/components/primitives/spinner.tsx` | `./spinner.md` (TODO) | Shipping |

## Contract file template

Each primitive's contract file has the same sections — copy this when
adding one.

```markdown
# <Component>

Short one-line summary of what this primitive is.

## When to use

- Bullet list of scenarios.

## When *not* to use

- Bullet list of confusions and the right alternative.

## Variants

| Prop | Values | Default | Notes |
|------|--------|---------|-------|

## Sizing

Touch-target + responsive notes.

## Accessibility

- Keyboard behavior
- Screen reader behavior
- Reduced motion behavior
- Required aria props

## Figma

- Component path: `FAMM / Core Library / <Component>`
- Variant property names must match TS prop names exactly.

## Don't fork

If you need a behavior this doesn't have, extend the variant — open a PR
against this primitive. Don't create `My<Component>` in feature code.
```

## Promotion rules

- A new L1 primitive requires DS-owner approval. Open an issue first,
  not a PR.
- A pattern (L2) that proves it composes the same five primitives in the
  same shape across 2+ features is a candidate to fold into a new L1.
- Removing a primitive needs a one-release deprecation period
  (`@deprecated` JSDoc + Figma "🪦 Deprecated" page).
