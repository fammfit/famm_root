# FAMM Fitness — Figma Management Guide

Status: Living document. Companion to `docs/DESIGN_SYSTEM.md`. Where this file
and the design-system strategy disagree, the strategy wins and this file is
updated to match.

Scope: how the **FAMM Design System** Figma library is structured, named,
maintained, and kept in sync with `packages/ui`. Anyone editing the Figma file
— designer, PM, or AI assistant — is expected to follow this guide.

---

## 0. Library shape

One published Figma library: **FAMM Design System**. Consumed by the FAMM
product file (`FAMM Product`) and the marketing file (`FAMM Marketing`).
Nothing else publishes styles, variables, or components to the org.

The library has exactly the eleven pages listed below, in this order. New
top-level pages require DS-owner approval and an update to this document.

| # | Page | Tier in code | Owner |
|---|---|---|---|
| 1 | Cover / Instructions | — | DS owner |
| 2 | Foundations | — | DS owner |
| 3 | Variables / Tokens | tokens (§4 of DS) | DS owner |
| 4 | Typography | tokens | DS owner |
| 5 | Color | tokens | DS owner |
| 6 | Layout / Grid | tokens | DS owner |
| 7 | Components | L1 primitives | DS owner |
| 8 | Patterns | L2 patterns | DS owner + feature lead |
| 9 | Templates | L3 / page composition | Feature team |
| 10 | Accessibility | — | DS owner |
| 11 | Changelog | — | DS owner |

Global conventions that apply on every page:

- **Frame naming:** `NN — Title` (e.g. `01 — Cover`). Two-digit prefix keeps
  Figma's sidebar in deterministic order.
- **Component naming:** `Category/Component/Variant` matching the React export
  path. `Button/Primary/Default` ↔ `<Button variant="primary" />`.
- **Token / variable naming:** dot-separated, identical to `tokens.json`.
  `color.surface.default`, `space.inset.md`, `radius.control`. No "/" in
  variable names — Figma will still group them by dot.
- **Status emoji** on frames and components:
  - 🟢 Stable — published, in code.
  - 🟡 In review — exists in Figma, PR open or not yet merged.
  - 🔴 Draft — exploration only. Never consumed by Product/Marketing files.
  - 🪦 Deprecated — kept for one minor release, then removed.
- **Linked GitHub issue / PR** goes in the frame description, not as a sticky.

---

## 1. Cover / Instructions

**Purpose.** Front door of the library. Tells a first-time viewer what this
file is, who owns it, how to contribute, and where to find the rules.

**What belongs there.**
- Library title, current published version (matches `packages/ui` package
  version), and last-publish date.
- DS owner name + escalation path (Slack channel, on-call rota).
- Two-sentence "what this is / what this isn't" — pulled from
  `DESIGN_SYSTEM.md §1`.
- Links: `docs/DESIGN_SYSTEM.md`, `docs/FIGMA_GUIDE.md` (this file),
  `packages/ui` README, the live Storybook URL.
- "How to propose a change" flowchart (token? component? pattern? template?)
  pointing at the right Figma page and the matching GitHub label.
- Legend for the status emoji.

**Naming conventions.** Single frame `01 — Cover`. No components live here.
Any sticky notes are prefixed `NOTE:` and dated `YYYY-MM-DD`.

**Maintenance rules.**
- Update the version + date on every library publish (see §11).
- Owner field reviewed quarterly.
- No experimental content. If it doesn't belong on a billboard at the
  entrance, it doesn't belong here.

**GitHub connection.** Links to `docs/DESIGN_SYSTEM.md` and the
`design-system` label filter. The version string here must match
`packages/ui/package.json` at publish time — CI publishes a discrepancy
warning in the changelog comment.

**Document for developers.** Nothing component-specific. This page is
orientation only; developers reading it should leave knowing where to go
next, not what to build.

---

## 2. Foundations

**Purpose.** The "why" layer. Captures the brand and product principles that
every later decision is derived from, so reviewers can ground critique in
something concrete.

**What belongs there.**
- The five core principles from `DESIGN_SYSTEM.md §2`, verbatim. If they
  disagree, fix this file, not the principles.
- Brand voice notes (energetic / trustworthy / calm), with one do/don't
  example per axis.
- Motion philosophy: where motion is allowed, what triggers it, the
  reduced-motion contract.
- Iconography rules: `lucide-react` only, 1.5px stroke, 24px grid.
- Photography / illustration guardrails (if any).

**Naming conventions.** Section frames named `02.1 — Principles`,
`02.2 — Voice`, `02.3 — Motion`, `02.4 — Iconography`. No components.

**Maintenance rules.**
- Read-only for non-DS-owners. PRs to `DESIGN_SYSTEM.md` are the route in.
- Update in lockstep with the strategy doc — never let them drift.

**GitHub connection.** Each section frame's description links to the
corresponding `§` of `DESIGN_SYSTEM.md`. Motion section references
`packages/ui/src/hooks/useReducedMotion.ts`.

**Document for developers.** The contract for *when* to use motion, accent
color, and signal color. Developers shouldn't have to guess whether a
celebratory animation is appropriate — it's stated here.

---

## 3. Variables / Tokens

**Purpose.** The source of truth for primitive and semantic tokens. This
page **is** the design contract; the Color/Typography/Layout pages are
human-readable views onto it.

**What belongs there.**
- Figma **Variables** collections matching the three-layer model in
  `DESIGN_SYSTEM.md §4.1`:
  - `Primitive` — raw values (`color.brand.600`, `space.4`).
  - `Semantic` — intent (`color.surface.default`, `space.inset.md`).
    References primitives via Figma variable aliases.
  - `Component` — rare per-component overrides (`button.primary.bg`).
- Modes: `light` and `dark` on every semantic variable. A future
  `high-contrast` mode is reserved — leave the column placeholder.
- A small swatch / spec frame per collection so the variables are
  human-inspectable without opening the side panel.

**Naming conventions.** Dot-separated, matches `tokens.json` exactly. Plural
collection names (`Primitive`, `Semantic`, `Component`). No `--` prefixes —
those are CSS-side only and added by the build.

**Maintenance rules.**
- Adding a primitive: DS-owner approval + design ticket.
- Adding a semantic: requires a use case that can't be expressed by an
  existing semantic. Document the use case in the variable description.
- **Never** rename or delete a published variable in place. Deprecate
  (`🪦` prefix on description, redirect to replacement) and remove after
  one minor release.
- Component tokens require a linked open PR before merging.

**GitHub connection.** This page is the **export source** for
`packages/ui/src/tokens/tokens.json` via Tokens Studio + the nightly GitHub
Action (`DESIGN_SYSTEM.md §4.2`). A token added here without an
accompanying export run will be flagged by the diff check in CI. The
generated `tokens.css`, `tokens.ts`, and Tailwind theme are all downstream
of this page — *no one* hand-edits them.

**Document for developers.**
- The semantic name and its intent (one sentence: "use this when…").
- Which Tailwind utility consumes it (e.g. `color.surface.raised` →
  `bg-surface-raised`).
- Whether it has a dark-mode value (yes, always — flag if not).
- Any contrast-pair guarantees (`text.primary` on `surface.default` ≥ 7:1).

---

## 4. Typography

**Purpose.** Human-readable view of the type system. Designers pick text
styles here; developers see exactly which Tailwind class maps to which
visual.

**What belongs there.**
- A **Text Styles** specimen for every published style: display, h1–h4,
  body, body-sm, label, caption, mono. One frame per style with sample
  copy, line-height ruler, and the resolved variable values.
- Responsive specimens: each style shown at `sm` / `md` / `lg` breakpoints
  if it scales.
- Type pairing examples (heading + body, stat value + stat label).

**Naming conventions.** Figma Text Styles named `text/<role>/<size>`:
`text/display`, `text/heading/h1`, `text/body/default`, `text/body/sm`,
`text/label`, `text/caption`, `text/mono`. These match the Tailwind utility
suffixes (`text-display`, `text-h1`, …).

**Maintenance rules.**
- Type styles reference Semantic variables for size, line-height, weight,
  and tracking. No raw numeric overrides on a layer that uses a Text Style.
- Adding a new role requires DS-owner approval. Adding a size within an
  existing role is a normal PR.
- Specimens regenerate from variables — if a number on this page disagrees
  with the variable, the specimen is stale and must be re-bound.

**GitHub connection.** Text styles map 1:1 to Tailwind typography utilities
generated from `packages/ui/src/tokens/tokens.json`. CI diff on
`tokens.json` will list any type-style change; a missing matching Figma
update blocks the PR.

**Document for developers.**
- Which token underlies the style (`font.size.300`, `font.lineHeight.tight`).
- Which Tailwind class to use (`text-h2`).
- When *not* to use it (e.g. "do not use `text-display` inside cards —
  reserved for hero surfaces").
- Truncation / wrapping expectations.

---

## 5. Color

**Purpose.** Human-readable view of the color system, organized by intent,
not by hue.

**What belongs there.**
- Swatch grids for each semantic family: `surface.*`, `text.*`, `border.*`,
  `accent.*`, `signal.*`. Each swatch shows the semantic name, the
  primitive it aliases, and the contrast ratio against its canonical
  partner.
- Light / dark side-by-side specimens.
- "Pair matrix" frame: every `text.*` token on every `surface.*` token with
  pass/fail badges for WCAG AA (4.5:1) and AAA (7:1).
- Signal usage examples: `signal.success` on a completed set, `signal.pr`
  on a personal record, `signal.danger` on a destructive confirm.

**Naming conventions.** Swatch component name = the semantic token name.
Frame headers use the semantic family name (`Surface`, `Text`, `Accent`,
`Signal`, `Border`).

**Maintenance rules.**
- Only **Semantic** color variables appear as consumable swatches.
  Primitives appear in a separate, clearly-labeled "Reference only" frame
  and are not used in product designs.
- Contrast badges regenerate on every publish — a stale or failing badge
  blocks publish.
- Accent color is one family. Adding a second accent requires a brand-level
  decision logged in `docs/DECISION_LOG.md`.

**GitHub connection.** Same export path as §3. The allowed Tailwind color
families (`surface-*`, `text-*`, `accent-*`, `signal-*`, `border-*`) listed
in `CLAUDE.md` are exactly the families on this page — they must stay in
sync, enforced by `packages/config/eslint/design-system.js`.

**Document for developers.**
- Intent in one line ("`surface.raised` is for cards and popovers that sit
  above the page surface").
- The Tailwind utility (`bg-surface-raised`).
- Contrast pairings that are guaranteed and ones that are not.
- States: hover / active / focus offsets if the token provides them.

---

## 6. Layout / Grid

**Purpose.** Defines the spatial system: breakpoints, grids, spacing scale,
radii, elevation. Anything that controls *where* things sit, not what they
look like.

**What belongs there.**
- Breakpoint reference: `sm 640`, `md 768`, `lg 1024`, `xl 1280` — matching
  Tailwind defaults unless `DESIGN_SYSTEM.md §6` says otherwise.
- Layout grids defined as Figma Grid Styles, one per breakpoint.
- Spacing scale visualizer: `space.inset.*`, `space.stack.*`,
  `space.inline.*` shown as boxes with rulers.
- Radii: `radius.control`, `radius.card`, `radius.pill` with example shapes.
- Elevation: `shadow.raised`, `shadow.overlay` with light + dark samples.
- Safe-area guidance for mobile viewports.

**Naming conventions.** Grid styles `grid/<breakpoint>` (`grid/sm`,
`grid/md`, `grid/lg`). Effect styles `shadow/<role>`. Spacing variables
keep their `space.inset.md` form.

**Maintenance rules.**
- Breakpoints change only via a `DESIGN_SYSTEM.md` PR. Changing them in
  Figma alone is a drift bug.
- The spacing scale is closed: `xs, sm, md, lg, xl, 2xl`. Adding a step
  requires DS-owner approval and a token PR.
- Frames demonstrating layout use real components, not placeholders, so
  the grid is shown carrying real density.

**GitHub connection.** Maps to the Tailwind theme extension generated from
`tokens.json`. The allowed spacing utilities (`p-inset-*`, `gap-stack-*`,
`gap-inline-*`) and radii (`rounded-control`, `rounded-card`,
`rounded-pill`) in `CLAUDE.md` are produced from this page.

**Document for developers.**
- Which spacing token to use where (insets inside containers, stack
  between blocks, inline between siblings on a row).
- Which Tailwind utility consumes each token.
- How a component should behave at each breakpoint (collapse, reflow,
  hide).

---

## 7. Components

**Purpose.** The L1 layer in Figma. Every primitive component that exists in
`packages/ui/src/components/primitives` has a counterpart here, and vice
versa. Two-way invariant.

**What belongs there.**
- One section frame per primitive: `Button`, `IconButton`, `Input`,
  `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Card`, `Stack`,
  `Text`, `Icon`, `Badge`, `Avatar`, etc.
- For each component:
  - The Figma component set with **all variants** (variant names match the
    React prop values exactly).
  - All states: default, hover, focus-visible, active, disabled, loading,
    error.
  - A "do / don't" frame.
  - A props table that mirrors the TS prop interface, including defaults.
  - Accessibility notes: role, accessible name source, keyboard map.

**Naming conventions.**
- Component set name = component name (`Button`).
- Variant axes match React props: `variant`, `size`, `state`, `tone`.
- Variant values match prop values (`variant=primary`, not `Variant=Primary`).
  Figma's variants are case-insensitive in selection but consistency
  matters for diff reviews.

**Maintenance rules.**
- Adding a variant: extend the existing component set. Do **not** fork into
  a new component — same rule as `cva()` in code (CLAUDE.md §2).
- Renaming a variant is a breaking change. Deprecate first, then remove
  after one minor.
- A primitive may not depend on a pattern. If a primitive's example uses a
  pattern, the example moves to the Patterns page.
- Every primitive carries the `🟢` status emoji once shipped; new ones are
  `🟡` until the PR merges.

**GitHub connection.**
- 1:1 with `packages/ui/src/components/primitives/<Component>.tsx`.
- Each component frame description includes the path and the Storybook URL.
- CI check: a list of exported primitives is diffed against the components
  on this page (via a Figma plugin export). Missing or orphan entries fail
  the PR.

**Document for developers.**
- Exact prop names, types, defaults — matching the TS interface.
- Required ARIA attributes the component owns vs. the consumer supplies.
- Focus ring behavior (uses `--focus-ring` token; never `outline: none`).
- Minimum touch target (44×44 on touch viewports per
  `DESIGN_SYSTEM.md §5`).
- Reduced-motion behavior if the component animates.

---

## 8. Patterns

**Purpose.** The L2 layer in Figma. Composites built from primitives that
recur across features (`StatCard`, `WorkoutRow`, `SessionTimer`,
`FormField`, etc.). Lives in `packages/ui/src/components/patterns`.

**What belongs there.**
- One section frame per pattern, with the same structure as a primitive:
  component set, variants, states, do/don't, props table, a11y notes.
- Plus a **composition spec**: a labeled diagram showing which primitives
  the pattern consumes. `StatCard = Card + Text(value) + Text(label) +
  Icon`. This is the diff anchor when the pattern is updated.
- Density examples: pattern in `compact` vs `comfortable` if it has the
  axis.

**Naming conventions.**
- Component set name = pattern name (`StatCard`).
- Variant axes match React props.
- Composition diagrams use the **exact** primitive component names so that
  reviewers can verify the spec without opening code.

**Maintenance rules.**
- A pattern is only valid if it can be built from L1 + tokens — no raw
  visual styling. Mirrors `DESIGN_SYSTEM.md §3`.
- A pattern that's only used in one feature is misplaced: it lives at L3
  (Templates page or app-local) until it's reused.
- Promotion from L3 → L2 follows the rule in `DESIGN_SYSTEM.md §3`
  (2+ features). The promotion lands as one PR touching both Figma and
  `packages/ui`.
- Deprecation handled the same as primitives (🪦, one minor, then removed).

**GitHub connection.**
- 1:1 with `packages/ui/src/components/patterns/<Pattern>.tsx`.
- The composition diagram is informally a "story" — its primitives must
  appear in the pattern's import list. Reviewers can spot-check by reading
  the file.

**Document for developers.**
- The intent ("use `StatCard` to surface a single metric with context").
- Which primitives compose it and which are swappable.
- Slots / children the consumer can provide.
- Loading and empty states — patterns own them, callers shouldn't reinvent.
- Responsive behavior at `sm` / `md` / `lg`.

---

## 9. Templates

**Purpose.** Full-page compositions ("Booking wizard", "Workout in
progress", "Profile") used for product design, review, and handoff. The
L3 layer in Figma; lives in `apps/web/src/components/<feature>` in code,
or as a Next.js route.

**What belongs there.**
- One section frame per route or significant flow.
- Each template assembles only Patterns and Primitives. If you find
  yourself drawing a rectangle here, you're missing a primitive or a
  pattern — file an issue instead of inlining a one-off.
- States covered: empty, loading, error, populated, edge (long names,
  numeric extremes, dense data).
- Responsive views: at least `sm` and `lg`. `md` if behavior differs.
- Annotation layer (toggleable) describing data sources, interactions, and
  edge cases for developer handoff.

**Naming conventions.** Frames named `Route — <Path> — <State>`, e.g.
`Route — /book/[trainerId] — Loading`. Matches the Next.js route segment so
a developer can map screen → file in one step.

**Maintenance rules.**
- Templates may diverge from production briefly during exploration (`🔴`),
  but anything published as `🟢` must match the live app.
- A template that introduces a new visual idiom is invalid — extract a
  pattern first, then build the template from it.
- Each template references the feature owner (not the DS owner) in its
  description.

**GitHub connection.**
- Maps to `apps/web/src/app/<route>/` and `apps/web/src/components/<feature>/`.
- PRs touching a route should attach screenshots of the updated template
  (light + dark, mobile + desktop) — the PR checklist in `CLAUDE.md`
  enforces this.
- Templates are *not* exported as components; they are reference artifacts.

**Document for developers.**
- The data the screen needs (endpoint or query key).
- Interaction map: what each control does, where it routes, what it
  optimistically updates.
- Edge cases and their visuals (empty playlist, expired session, payment
  failed).
- Analytics events fired and their names.

---

## 10. Accessibility

**Purpose.** The accountability page. Documents how the library meets
WCAG 2.2 AA and how that's verified. Mirrors `DESIGN_SYSTEM.md §5`.

**What belongs there.**
- The hard rules from `DESIGN_SYSTEM.md §5`, restated for designers.
- A contrast pair matrix (also referenced from Color, §5 of this guide).
- Focus-ring specimens for every interactive primitive.
- Keyboard maps: for each interactive component, the keys it responds to.
- Reduced-motion examples: before/after for every animated component.
- Touch-target heatmaps showing the 44×44 minimum.
- A11y review log: every primitive/pattern with date last audited and the
  auditor.

**Naming conventions.** Section frames `10.1 — Contrast`, `10.2 — Focus`,
`10.3 — Keyboard`, `10.4 — Motion`, `10.5 — Targets`, `10.6 — Audit log`.

**Maintenance rules.**
- Every new primitive or pattern adds a row to the audit log before it
  ships as `🟢`. No exceptions.
- Audit dates older than 6 months on a stable component trigger a re-audit
  ticket.
- A failing contrast badge anywhere in the library blocks publish.

**GitHub connection.**
- The keyboard maps and ARIA contracts here must match the component
  source. `eslint-plugin-jsx-a11y` and `axe-core` Vitest runs are the
  programmatic counterpart.
- A Lighthouse a11y score < 95 on a key route opens an issue tagged
  `a11y` and is referenced here until closed.

**Document for developers.**
- Required keyboard interactions per component (Enter/Space, arrow keys,
  Esc).
- ARIA attributes the component owns vs. the caller supplies.
- Live-region usage (timers, set counters use `aria-live="polite"`).
- The reduced-motion fallback for any animation.

---

## 11. Changelog

**Purpose.** Append-only record of what changed in the Figma library and
how it relates to releases of `packages/ui`. The thing reviewers consult
when they ask "did this PR land in Figma?"

**What belongs there.**
- One entry per published library version. Entry header =
  `vX.Y.Z — YYYY-MM-DD`, matching the `packages/ui` version.
- Sections per entry: **Added**, **Changed**, **Deprecated**, **Removed**,
  **Fixed**. Items reference component or token names exactly and link the
  GitHub PR.
- A "Drift" section for any item that landed in Figma without a code PR
  yet (`🟡` items) — should be empty most of the time.
- Migration notes when a deprecation removes after one minor (which prop
  to switch to, what the rename was).

**Naming conventions.** Frame `11 — Changelog`. Entries top-down,
newest first. Each entry is its own frame named `vX.Y.Z`.

**Maintenance rules.**
- A library publish without a changelog entry is invalid — the publish
  template requires the entry frame to exist.
- Entries are append-only. To correct a mistake, add a new entry that
  references and supersedes the previous one.
- Deprecation entries must also flip the component's status to `🪦` on its
  home page (Components / Patterns).

**GitHub connection.**
- Each entry's PR links must resolve. CI on `main` posts a comment with
  the diff between `packages/ui/package.json` version and the latest
  changelog entry — a mismatch fails the release workflow.
- Items here mirror the changelog in `packages/ui/CHANGELOG.md` (once that
  file lands). When both exist, they must agree.

**Document for developers.**
- What changed, in component/token terms.
- Whether the change is breaking (variant rename, removed prop, token
  rename) and the migration path.
- Which release of `packages/ui` carries the change.

---

## Appendix A — Publishing checklist

Before publishing the library:

```
- [ ] All in-scope work has merged in `packages/ui` on `main`
- [ ] Tokens regenerated; `tokens.json` diff matches the Variables page
- [ ] All new components/patterns have a11y rows in §10's audit log
- [ ] Contrast matrix has no failing badges
- [ ] Changelog entry drafted, version matches `packages/ui/package.json`
- [ ] Cover page version + date updated
- [ ] No 🔴 components in published pages (Components / Patterns / Templates)
- [ ] Storybook deploy is green
```

## Appendix B — When in doubt

1. Check `docs/DESIGN_SYSTEM.md` — it's the source of truth.
2. Check this file — it tells you where in Figma the thing belongs.
3. Ask the DS owner before inventing a new page, family, or naming scheme.
   The cost of a 5-minute question is much lower than the cost of drift.
