# FAMM Fitness — UX/UI Design System Strategy

Status: Living document. Source of truth for visual, interaction, and code-level
UI decisions across Figma, GitHub, Cursor, and Claude Code.

Scope: `apps/web` (Next.js) consumes the shared library `packages/ui`. All net-new
UI in the fitness app must be expressible as a composition of `@famm/ui`
primitives + tokens. If it can't, the system grows — not the app.

---

## 1. Purpose of the System

The design system exists to make the FAMM fitness product feel like **one
coherent product** across web, marketing surfaces, and future mobile shells,
while letting a small team (humans + AI assistants) ship quickly without drift.

Concretely it must:

- Provide a **single canonical vocabulary** (tokens + components) shared by
  Figma and code, so a design decision made once propagates everywhere.
- Encode the brand: a fitness product that feels **energetic, trustworthy, and
  calm** — performance data without anxiety, motivation without hype.
- Be **AI-legible**: tokens, component contracts, and rules are written so that
  Cursor and Claude Code can reliably reuse them instead of inventing one-off
  UI.
- Be **measurable**: we can detect drift (unauthorized colors, ad-hoc spacing,
  duplicate buttons) in CI rather than in review.

Non-goals: branded marketing motion graphics, native iOS/Android components,
internal admin tools (those may consume tokens but are out of governance scope).

---

## 2. Core Design Principles

Five principles, in priority order. When two conflict, the higher one wins.

1. **Clarity over cleverness.** A user mid-workout has ~2 seconds of attention.
   Numbers, next action, and state are the loudest things on the screen.
2. **Calm by default, energetic on signal.** Neutral surfaces and quiet
   typography are the baseline; saturated accent color, motion, and haptics
   are *reserved* for moments that earn them (PR set, streak, completion).
3. **One way to do a thing.** If a `Button`, `Card`, or `Stat` exists, you use
   it. Variants extend the canonical component; they don't fork it.
4. **Accessible by construction.** Contrast, focus, motion-reduction, and
   target sizes are enforced by the component, not left to the consumer.
5. **Token-driven, not value-driven.** No raw hex, px, or ms in app code.
   If a token doesn't exist for what you need, add one — don't bypass.

---

## 3. Component Governance Model

Three tiers. Promotion is one-way (L1 → L2 → L3) and gated by review.

| Tier | Lives in | Owner | Stability | Examples |
|------|----------|-------|-----------|----------|
| **L1 Primitive** | `packages/ui/src/components/primitives` | Design system owner | Stable, semver-tracked | `Button`, `Input`, `Card`, `Stack`, `Text`, `Icon` |
| **L2 Pattern** | `packages/ui/src/components/patterns` | DS owner + feature lead | Stable within a release train | `StatCard`, `WorkoutRow`, `SessionTimer`, `FormField` |
| **L3 Feature** | `apps/web/src/components/<feature>` | Feature team | Free to change | `BookingWizard`, marketing hero |

Rules:

- L3 may compose L1/L2 freely. L3 may **not** reach into `node_modules` for
  alternative component libraries — if shadcn/Radix/etc. is needed, it's
  wrapped at L1 first.
- L2 components must be built from L1 + tokens. Raw HTML elements are allowed
  inside L2 only for semantic structure (`<section>`, `<ul>`), never for
  styled visuals.
- A new L3 component that gets used in **2+ features** triggers a promotion
  proposal to L2. A new L2 used in **2+ products/surfaces** triggers L1
  promotion.
- Every component ships with: TS types, a Figma counterpart with matching
  variant names, prop docs, a usage example, and a11y notes. No exceptions
  for L1/L2.
- Deprecation: mark with `@deprecated` JSDoc + Figma "🪦 Deprecated" page.
  Removal lands one minor release after deprecation; CI fails on new usage.

---

## 4. Token Strategy

Tokens are the contract between Figma and code. We use a three-layer model.

### 4.1 Layers

1. **Primitive tokens** — raw values. Never used directly in app code.
   - `color.brand.600 = #2E5BFF`
   - `space.4 = 16px`
   - `font.size.300 = 18px`
2. **Semantic tokens** — intent. This is what app code and Figma styles
   reference.
   - `color.surface.default`, `color.surface.raised`, `color.text.primary`,
     `color.text.muted`, `color.accent.default`, `color.signal.success`,
     `color.signal.danger`, `color.signal.pr` (personal record)
   - `space.inset.md`, `space.stack.sm`, `radius.control`, `shadow.raised`
3. **Component tokens** — per-component overrides where semantic alone is
   insufficient. Rare; require DS-owner approval.
   - `button.primary.bg`, `statcard.value.fontSize`

### 4.2 Storage and pipeline

- Tokens authored in **Figma Variables** are the source of truth for
  designers.
- Exported nightly (and on demand) to `packages/ui/src/tokens/tokens.json`
  via Tokens Studio + a GitHub Action.
- Build step generates:
  - `packages/ui/src/tokens/tokens.css` (CSS custom properties on `:root` +
    `[data-theme="dark"]`)
  - `packages/ui/tailwind.config.ts` theme extension (consumed by both
    `@famm/ui` and `apps/web`)
  - `packages/ui/src/tokens/tokens.ts` (typed const for non-CSS contexts)
- Tailwind utilities are the **only** sanctioned styling API in app code.
  Inline `style={}` and raw class strings with hex/px are caught by ESLint
  (see §7).

### 4.3 Theming

- Light is default. Dark theme is a first-class peer — every semantic token
  has both values. Themes switch via `data-theme` on `<html>`.
- High-contrast theme is a future variant; semantic naming must not preclude
  it.

---

## 5. Accessibility Requirements

Baseline: **WCAG 2.2 AA** for all user-facing surfaces. AAA where cheap.

Hard rules — enforced in code review and (where possible) by lint/tests:

- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and meaningful
  UI graphics. Tokens are pre-validated; if you bypass tokens, contrast is
  your problem.
- Every interactive element has a **visible focus ring** using
  `--focus-ring` token. Never `outline: none` without a replacement.
- Minimum touch target 44×44 CSS px on touch, 24×24 on pointer (WCAG 2.2).
  `Button`, `IconButton`, and form controls enforce this via component
  tokens.
- All form inputs have an associated `<label>`; `FormField` (L2) enforces
  this — bare `<input>` is banned outside L1.
- Motion: respect `prefers-reduced-motion`. Animations longer than 200ms or
  involving translation must have a reduced variant. Component-level
  `useReducedMotion` hook in `@famm/ui`.
- Live data (timers, set counters) announced via `aria-live="polite"`;
  alerts via `role="alert"`.
- Keyboard: every interaction reachable without a pointer. Tab order
  follows visual order. Modals trap focus and restore on close.
- Icons that convey meaning carry an accessible name; decorative icons get
  `aria-hidden`.
- Automated checks: `eslint-plugin-jsx-a11y` (error level), `axe-core` in
  Vitest for each L1/L2 component, Lighthouse a11y ≥ 95 on key routes in
  CI.

---

## 6. Responsive Design Rules

Mobile-first. Layout is composed from layout primitives (`Stack`, `Cluster`,
`Grid`), not bespoke media queries in feature code.

### 6.1 Breakpoints (semantic, not device names)

| Token | Min width | Intended use |
|-------|-----------|--------------|
| `sm` | 480px | Large phones |
| `md` | 768px | Tablets, foldables |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Standard desktop |
| `2xl` | 1536px | Wide desktop / external monitor |

### 6.2 Rules

- Default styles are mobile (`<sm`). All other breakpoints are
  progressive enhancements.
- Touch is the assumed input below `lg`; pointer-only affordances (hover
  reveals, right-click) must have a touch-equivalent.
- Container widths are tokenized: `container.sm/md/lg/xl`. Pages do not
  invent their own max-widths.
- Type scale is fluid (`clamp()`) between `sm` and `lg`; locked above.
- Density: app supports **comfortable** (default) and **compact**
  densities; compact reduces vertical spacing by one step on `lg+`.
- Orientation: workout/timer screens must remain legible in landscape on
  phones (common during cardio).
- No horizontal scroll on any breakpoint except intentional carousels.

---

## 7. AI Usage Rules

These rules apply to Cursor, Claude Code, and any other LLM-driven tooling
generating UI. They exist to prevent the most common failure mode:
plausible-looking UI that quietly forks the system.

### 7.1 Hard rules (CI-enforced where possible)

1. **Never introduce raw values.** No hex colors, no px/rem literals, no
   `rgb()` in app code. ESLint rule `no-restricted-syntax` flags these in
   `apps/web/**` and `packages/ui/src/components/{patterns,**}` (primitives
   excepted).
2. **Never create a new component that duplicates an existing one.** Before
   creating `XyzButton`, search `packages/ui` for `Button` and extend it via
   variant or `asChild`. The agent prompt template (`.cursor/rules`,
   `CLAUDE.md`) lists this as step 1.
3. **Never bypass the token pipeline.** New visual values are added to
   Figma Variables → exported → consumed. AI may *propose* a token in a PR;
   it may not hand-edit `tokens.json` without a linked design ticket.
4. **No new dependencies for UI** (e.g., another component library, icon
   set, animation lib) without a DS-owner approval comment in the PR.
5. **Output must include a self-check.** Every AI-generated UI PR
   description contains a filled-in checklist (§8.3); missing checklist =
   automatic request-changes.

### 7.2 Soft rules (review-enforced)

- Prefer composition over props explosion. If a component grows past ~6
  variant axes, it's two components.
- Don't generate Storybook-grade prose docs unless asked; one usage
  example + prop table is the norm.
- When uncertain between two patterns, the agent should stop and ask, not
  pick. The `AskUserQuestion` flow exists for this.

### 7.3 Agent context files

- `CLAUDE.md` at repo root summarizes this document for Claude Code:
  pointers to `packages/ui`, the token files, and a "before you write JSX"
  checklist.
- `.cursor/rules/design-system.mdc` mirrors the same checklist for Cursor.
- Both are regenerated from this document by a script; do not edit them by
  hand.

---

## 8. GitHub Review Process

### 8.1 Branching and labels

- Branches: `feat/<area>-<slug>`, `fix/<area>-<slug>`, `ds/<slug>` for
  design-system-only changes.
- Labels (auto-applied by paths):
  - `area:design-system` — any change under `packages/ui/**` or
    `docs/DESIGN_SYSTEM.md`.
  - `area:tokens` — `packages/ui/src/tokens/**`.
  - `needs:design-review` — added when `area:design-system` is set and PR
    author isn't the DS owner.

### 8.2 Required checks before merge

- `lint` (ESLint including a11y + no-raw-values rules)
- `typecheck`
- `test` (Vitest, including axe-core component tests)
- `build` (`turbo build`)
- Visual regression on `packages/ui` stories (Playwright + pixelmatch — no
  SaaS dependency, runs locally; see `.github/workflows/visual-regression.yml`)
  — required for `area:design-system` PRs once the stories surface lands.
- For `area:design-system`: one approval from a designated DS owner
  (CODEOWNERS).

### 8.3 PR template additions (UI changes)

```
## UI checklist
- [ ] No raw color/space/radius values introduced
- [ ] Reused existing L1/L2 components where applicable
- [ ] New/changed components have Figma counterparts linked below
- [ ] A11y: keyboard, focus, contrast, reduced-motion verified
- [ ] Responsive: verified at sm / md / lg
- [ ] Screenshots: light + dark, mobile + desktop
- [ ] Figma link: <url>
```

### 8.4 Review etiquette

- Designers review Figma fidelity; engineers review code & a11y; DS owner
  reviews system fit.
- Comments reference token names, not values: "use `color.text.muted`",
  not "use #6B7280".

---

## 9. Figma Management Process

### 9.1 File structure

- **`FAMM / Foundations`** — colors, type, spacing, radii, shadows,
  motion. Variables live here.
- **`FAMM / Core Library`** — L1 primitives + L2 patterns as Figma
  components. Published as a team library.
- **`FAMM / Product`** — feature designs (booking, workouts, profile).
  Consumes Core Library only; no detached instances allowed.
- **`FAMM / Explorations`** — sandbox. Nothing here ships. Promotion to
  Product requires a review.

### 9.2 Naming conventions

- Component names mirror code: `Button/Primary/Default`,
  `Card/Stat/Default`. Variant property names match TS prop names exactly.
- Pages prefixed with status emoji: `✅ Ready`, `🚧 In progress`,
  `🪦 Deprecated`.

### 9.3 Workflow

1. Designer drafts in Explorations using existing tokens/components.
2. PR-equivalent: a Figma branch + a Linear/GitHub ticket linking to
   frames.
3. Engineer + DS owner review. Sign-off comment in the ticket is the
   merge gate.
4. Variables/component changes merged to main Figma branch trigger the
   nightly token export Action.
5. Versioning: Core Library is versioned with a `vMAJOR.MINOR` page name;
   breaking variant changes bump major and require a code follow-up PR
   within one sprint.

### 9.4 Figma ↔ code parity

- DS owner runs a monthly parity audit: every Figma component has a code
  counterpart with matching variants and vice versa. Drift gets a ticket.

---

## 10. Recommended Folder Structure

Reflects what exists today (`packages/ui`, `apps/web`) plus the additions
this strategy requires. New folders are marked **NEW**.

```
famm_root/
├── apps/
│   └── web/
│       └── src/
│           ├── app/                       # Next.js routes
│           ├── components/                # L3 feature components only
│           │   └── <feature>/
│           └── lib/
├── packages/
│   └── ui/                                # @famm/ui — the design system package
│       ├── src/
│       │   ├── tokens/                    # NEW
│       │   │   ├── tokens.json            # generated from Figma
│       │   │   ├── tokens.css             # generated CSS variables
│       │   │   └── tokens.ts              # generated typed consts
│       │   ├── components/
│       │   │   ├── primitives/            # NEW — L1: Button, Input, Card, ...
│       │   │   └── patterns/              # NEW — L2: StatCard, FormField, ...
│       │   ├── hooks/                     # NEW — useReducedMotion, useTheme
│       │   ├── lib/                       # cn(), variant helpers
│       │   ├── icons/                     # NEW — curated lucide subset + custom
│       │   └── index.ts
│       ├── stories/                       # NEW — visual regression source
│       ├── tests/                         # NEW — axe + interaction tests
│       └── tailwind.config.ts             # extends generated token theme
├── design/                                # NEW
│   ├── figma-export/                      # raw Tokens Studio export landing zone
│   └── screenshots/                       # reference screenshots for VRT baselines
├── docs/
│   ├── DESIGN_SYSTEM.md                   # this file (strategy)
│   ├── DESIGN_SYSTEM_COMPONENTS.md        # NEW — per-component contract reference
│   ├── DESIGN_SYSTEM_TOKENS.md            # NEW — token catalog (generated)
│   └── ... (existing architecture docs)
├── .github/
│   ├── CODEOWNERS                         # @ds-owner for packages/ui/**, docs/DESIGN_SYSTEM*.md
│   ├── workflows/
│   │   ├── tokens-sync.yml                # NEW — nightly Figma → tokens.json
│   │   └── visual-regression.yml          # NEW — Chromatic/Playwright on PRs
│   └── PULL_REQUEST_TEMPLATE.md           # includes UI checklist
├── .cursor/
│   └── rules/
│       └── design-system.mdc              # NEW — AI rules mirror of §7
└── CLAUDE.md                              # NEW — Claude Code rules + DS pointers
```

---

## Appendix A — Definition of Done for a UI Change

A UI PR is mergeable when **all** of the following are true:

- Uses tokens and existing components; no raw values introduced.
- A11y verified per §5 (keyboard, focus, contrast, reduced motion, labels).
- Responsive verified at `sm` / `md` / `lg` minimum.
- Light + dark screenshots in the PR description.
- Figma frame linked; component variants match.
- Tests: unit + axe pass; visual regression diff reviewed.
- CODEOWNERS approvals present.

## Appendix B — Open Questions (tracked, not blocking)

- Do we adopt Radix primitives under the hood for L1, or roll our own?
  (Leaning Radix for `Dialog`, `Popover`, `Tooltip`, `Tabs`.)
- When do we introduce a native mobile shell, and does the token pipeline
  need a third output (RN StyleSheet / Tamagui)?
