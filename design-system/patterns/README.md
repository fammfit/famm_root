# Patterns (L2)

Composite components built from L1 primitives + tokens. Code in
[`../../packages/ui/src/components/patterns/`](../../packages/ui/src/components/patterns/).

Patterns earn their place by **being used by at least two features** or by
**encoding a non-trivial accessibility / interaction contract** that
shouldn't be re-implemented per feature.

## Current patterns

| Pattern | Code | Contract | Status |
|---------|------|----------|--------|
| `FormField` | `form-field.tsx` | `./form-field.md` (TODO) | Shipping |
| `StatCard` | `stat-card.tsx` | `./stat-card.md` (TODO) | Shipping |
| `SessionTimer` | `session-timer.tsx` | `./session-timer.md` (TODO) | Shipping |

## Candidates

Tracked here so we don't reinvent them ad-hoc:

- **`WorkoutRow`** — exercise + sets/reps/load with quick-edit.
- **`EmptyState`** — illustration slot + one sentence + one primary action.
- **`Pagination`** — accessible page controls; supports cursor & offset.
- **`Tabs`** — keyboard-navigable, scroll-preserving (see `ux-rules.md`).
- **`Modal`** / **`Sheet`** — focus trap, scrim, Escape, route-or-not
  decision baked in.
- **`Toast`** — single-channel, replace-on-newer.
- **`MetricSeries`** — sparkline + label + delta. Reuses `StatCard` tokens.

## Contract file template

```markdown
# <Pattern>

What it is in one line.

## Composes

- L1: <list>
- Tokens: <list>

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|

## States

| State | Behavior |
|-------|----------|
| Default | |
| Loading | |
| Empty | |
| Error | |

## Accessibility

- Keyboard
- Screen reader
- Reduced motion
- Touch target

## Figma

- Component path
- Variant parity

## Anti-patterns

- What this pattern is mistaken for and what to use instead.
```

## Promotion / demotion

- L3 feature component used by **2+ features** → promotion proposal to L2.
- L2 pattern used by **2+ surfaces or products** → promotion proposal to L1.
- An L2 with one consumer for more than a release cycle → demotion review;
  it likely belongs in `apps/web/src/components/<feature>/`.
