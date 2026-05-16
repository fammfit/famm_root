# FAMM Design System

This folder is the **documentation and governance surface** of the FAMM design
system. It is the place to look for *what* the system is and *why* a decision
was made. The runtime code lives next to it in `packages/ui`.

## Layout

```
design-system/
├── README.md              ← you are here
├── principles.md          ← the five principles that decide tie-breakers
├── ux-rules.md            ← interaction & behavior rules
├── accessibility.md       ← WCAG 2.2 AA baseline, enforced rules
├── responsive.md          ← breakpoints, layout, density
├── motion.md              ← duration, easing, signature motion, reduced motion
├── content-guidelines.md  ← voice, button labels, error copy, number formats
├── changelog.md           ← user-facing changes to the system
├── tokens/                ← token catalog (mirrors packages/ui/src/tokens)
├── components/            ← L1 primitive contracts
├── patterns/              ← L2 pattern contracts
└── templates/             ← L3 page-level layouts
```

## How this folder relates to code

| Layer | Documentation | Code |
|-------|---------------|------|
| Tokens | `design-system/tokens/` | `packages/ui/src/tokens/tokens.json` + generated `tokens.css`, `tokens.ts` |
| Primitives (L1) | `design-system/components/` | `packages/ui/src/components/primitives/` |
| Patterns (L2) | `design-system/patterns/` | `packages/ui/src/components/patterns/` |
| Templates (L3) | `design-system/templates/` | `apps/web/src/components/<feature>/` |

The strategy document (`docs/DESIGN_SYSTEM.md`) is the canonical source for
governance, ownership, and process. The files in this folder go deeper on the
**day-to-day** rules: what a button label should say, what a focus ring should
look like, when motion is allowed.

## Who edits what

- **Designers** own `principles.md`, `motion.md`, `content-guidelines.md`, the
  per-component contract files in `components/` and `patterns/`, and Figma.
- **Engineers** own the code in `packages/ui`, keep the contract files in sync,
  and write the `templates/` page layouts.
- **DS owner** (`@fammfit/design-system` in CODEOWNERS) signs off on token
  changes and on promotion between tiers.

## When to update

| You did this | Update this |
|--------------|-------------|
| Added/changed a primitive | `design-system/components/<name>.md` + `changelog.md` |
| Added/changed a pattern | `design-system/patterns/<name>.md` + `changelog.md` |
| Added a token | `tokens.json` → run `npm run tokens:generate` → note in `changelog.md` |
| Changed a rule | the relevant `*.md` here + `changelog.md` |
| Added a page-level layout | `design-system/templates/<name>.md` |

## Quick links

- Strategy: [`../docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md)
- Tokens source: [`../packages/ui/src/tokens/tokens.json`](../packages/ui/src/tokens/tokens.json)
- Lint enforcement: [`../packages/config/eslint/design-system.js`](../packages/config/eslint/design-system.js)
- AI rules: [`../.cursor/rules/`](../.cursor/rules/) and [`../CLAUDE.md`](../CLAUDE.md)
