# Changelog

All notable changes to the FAMM design system. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow
SemVer where major bumps signal a breaking change to a token name or a
component contract.

## [Unreleased]

### Added
- `/design-system/` documentation surface: principles, ux-rules,
  accessibility, responsive, motion, content-guidelines, changelog.
- Cursor rules under `.cursor/rules/00..05-*.mdc` aligned to the docs.
- Claude Code slash commands under `.claude/commands/`:
  `/audit-ui`, `/create-component`, `/refactor-component`,
  `/review-accessibility`.

## [0.1.0] — 2026-05-15

First versioned cut. Establishes tokens, governance, primitives, and a
small set of patterns.

### Added
- **Strategy doc** (`docs/DESIGN_SYSTEM.md`) covering principles, tier
  model, token strategy, a11y, responsive, AI rules, GitHub & Figma
  process, folder structure.
- **Tokens** at `packages/ui/src/tokens/tokens.json` (semantic source):
  surface, text, accent, signal (incl. `pr` for personal records),
  border, focus ring, inset/stack/inline space, control/card/pill radii,
  sm/md/lg shadows, fast/base/slow motion, container widths. Light + dark
  themes. Generated `tokens.css` and `tokens.ts` via
  `scripts/generate-tokens.mjs`.
- **Tailwind preset** (`packages/ui/tailwind.config.ts`) exposing semantic
  keys (`bg-accent`, `text-text-muted`, `p-inset-md`, `gap-stack-lg`,
  `rounded-card`, `shadow-focus`, `duration-fast`, etc.). The web app
  inherits via `presets: [uiPreset]`.
- **Primitives (L1)** migrated to semantic tokens:
  `Button`, `Card` (+ Header/Title/Description/Content/Footer), `Input`,
  `Badge`, `Spinner`. Icon button bumped to 44×44 for WCAG 2.2.
- **Patterns (L2)**:
  - `FormField` — label + control + hint/error with aria wiring.
  - `StatCard` — labelled metric for dashboards; `pr` tone reserved for
    personal-record moments.
  - `SessionTimer` — accessible countdown ring; branches on
    `useReducedMotion()`.
- **Hooks**: `useReducedMotion`.
- **ESLint enforcement** (`packages/config/eslint/design-system`): bans
  hex, raw `px`, `rgb()`/`hsl()`, and inline `style={}` outside L1
  primitives. Extends `plugin:jsx-a11y/recommended` with tightened
  defaults.
- **AI rules**:
  - `CLAUDE.md` at repo root with the "before you write JSX" checklist.
  - `.cursor/rules/design-system.mdc` (now superseded by numbered files).
- **CI**:
  - `.github/workflows/tokens-sync.yml` — fails PRs with stale token
    outputs.
  - `.github/workflows/visual-regression.yml` — scaffolded for
    Playwright + pixelmatch; gated to `workflow_dispatch` until a
    stories surface lands.
- **CODEOWNERS**: design-system paths route to `@fammfit/design-system`
  (placeholder team — replace before enabling required reviews).
- **PR template** includes the UI checklist.

### Decided
- VRT tool: **Playwright + pixelmatch** (no SaaS dependency, runnable
  locally). Recorded in `docs/DESIGN_SYSTEM.md` §8.2.

### Known limitations
- ESLint bans raw color/space values but does **not** catch drift across
  Tailwind utility class names (e.g. the default `gray-*`/`red-*`
  palette). Existing forked components in `apps/web/src/components/ui/`
  predate this work and need a separate migration.
- Visual regression workflow is a scaffold; no stories surface exists
  yet.
- `@fammfit/design-system` is a placeholder team handle.

### Open
- Whether to adopt Radix primitives under the hood for `Dialog`,
  `Popover`, `Tooltip`, `Tabs`.
- Mobile shell timing and whether the token pipeline needs a third
  output (RN StyleSheet / Tamagui).
