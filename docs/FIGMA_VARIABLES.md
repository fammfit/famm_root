# FAMM Fitness — Figma Variable Naming Rules

Status: Living document. Companion to `docs/DESIGN_SYSTEM.md` (token strategy,
§4) and `docs/FIGMA_GUIDE.md` (where variables live in Figma, §3).

Scope: how every Figma Variable in the **FAMM Design System** library is
named, so that the name in Figma is the same identifier that ends up in
`packages/ui/src/tokens/tokens.json`, `tokens.css`, `tokens.ts`, and the
Tailwind theme. Same string, every layer.

---

## 0. The core rule

> **A Figma variable name *is* the code identifier.** If you can't paste a
> Figma variable name into TypeScript and have it look right, the name is
> wrong.

Concretely:

- Lowercase. `dot.separated.path`. No spaces, no slashes, no camelCase, no
  PascalCase, no emoji, no parentheses, no `#`.
- ASCII only. No en-dashes, no smart quotes.
- Path segments are nouns or noun phrases. Numeric suffixes are unitless
  scale indices (`space.4`, not `space.16px`).
- The path encodes intent → role → variant, never appearance.
  `color.text.primary` ✅. `color.dark-gray` ❌.
- Every name resolves into exactly one of the three layers from
  `DESIGN_SYSTEM.md §4.1`:
  - **Primitive** — raw values. Never referenced from app code.
  - **Semantic** — intent. The only layer app code consumes.
  - **Component** — per-component overrides. Rare.

Figma collections: `Primitive`, `Semantic`, `Component`. Variables in
`Semantic` alias variables in `Primitive`; variables in `Component` alias
either layer.

---

## 1. Color

Two layers, hard separation.

### Primitive scale (collection: `Primitive`)

```
color.brand.{50…900}        # FAMM accent ramp
color.neutral.{0…1000}      # surface + text neutrals (0 = white, 1000 = black)
color.green.{50…900}        # signal: success / PR
color.red.{50…900}          # signal: danger
color.amber.{50…900}        # signal: warning
color.blue.{50…900}         # signal: info
```

Steps follow Tailwind's 50/100/200/.../900 convention. Steps may be added
(`350`) but never reordered.

### Semantic (collection: `Semantic`) — the only colors app code uses

```
color.surface.default        # page background
color.surface.raised         # cards, popovers above page
color.surface.sunken         # input fields, wells
color.surface.inverse        # inverted blocks (dark on light, etc.)

color.text.primary           # body copy
color.text.secondary         # supporting copy
color.text.muted             # de-emphasized
color.text.inverse           # text on .surface.inverse
color.text.on-accent         # text on accent-filled surfaces
color.text.link              # links in body copy

color.border.default         # standard dividers, input borders
color.border.subtle          # hairlines on raised surfaces
color.border.strong          # high-emphasis separators
color.border.focus           # focus ring (paired with --focus-ring)

color.action.primary         # primary button fill / accent
color.action.primary-hover
color.action.primary-active
color.action.secondary
color.action.secondary-hover
color.action.secondary-active
color.action.danger
color.action.danger-hover

color.signal.success         # workout completed, set logged
color.signal.danger          # destructive confirm, error state
color.signal.warning         # caution states
color.signal.info            # neutral info banners
color.signal.pr              # personal record celebration
```

Rules:

- `action.*` is for interactive fills (buttons, toggles). `accent.*` from
  the strategy doc is an alias of `action.primary` for non-interactive
  brand expression — pick one in your design, don't mix.
- State suffixes are `-hover` / `-active` / `-disabled` / `-selected`. Not
  `:hover`, not `Hover`.
- Never expose a primitive name in Semantic. `color.text.dark-gray-700` is
  banned; it's `color.text.primary` that happens to alias
  `color.neutral.900` in light mode.

---

## 2. Spacing

Single primitive scale, three semantic axes for use in app code.

### Primitive scale (collection: `Primitive`)

```
space.0   = 0
space.1   = 4px
space.2   = 8px
space.3   = 12px
space.4   = 16px
space.5   = 20px
space.6   = 24px
space.8   = 32px
space.10  = 40px
space.12  = 48px
space.16  = 64px
space.20  = 80px
space.24  = 96px
```

Numbers are unitless 4-px steps. The number is **not** the pixel value —
`space.4` is the fourth step, which equals 16px. New steps can be inserted
(`space.7 = 28px`) but never re-numbered.

### Semantic (collection: `Semantic`)

```
space.inset.xs       # padding inside small chips
space.inset.sm       # padding inside form controls
space.inset.md       # padding inside cards
space.inset.lg       # padding inside hero/feature surfaces
space.inset.xl

space.stack.xs       # vertical gap between tight siblings (label → input)
space.stack.sm       # between rows in a list
space.stack.md       # between blocks in a section
space.stack.lg       # between sections
space.stack.xl       # between page bands

space.inline.xs      # gap between icon and label
space.inline.sm      # gap between siblings on a row
space.inline.md      # gap between primary toolbar items
space.inline.lg
```

Rules:

- `inset` = inside a container. `stack` = vertical between siblings.
  `inline` = horizontal between siblings. Pick by *axis and role*, not by
  pixel count.
- The closed scale is `xs, sm, md, lg, xl, 2xl`. Adding a step requires
  DS-owner approval (per `DESIGN_SYSTEM.md §6` / `FIGMA_GUIDE.md §6`).
- App code never references a primitive `space.N` directly. ESLint flags
  raw `px` and bare numeric Tailwind classes outside L1.

---

## 3. Typography

Each typographic property is its own variable family. Text Styles in Figma
compose them — code consumes the named Tailwind utility, which is
generated from these variables.

### Primitive

```
font.family.sans     # default UI face
font.family.mono     # tabular / code / stat values

font.size.50         # 11px caption floor
font.size.100        # 12px caption
font.size.200        # 14px body-sm / label
font.size.300        # 16px body
font.size.400        # 18px lead
font.size.500        # 20px h4
font.size.600        # 24px h3
font.size.700        # 30px h2
font.size.800        # 36px h1
font.size.900        # 48px display

font.weight.regular  = 400
font.weight.medium   = 500
font.weight.semibold = 600
font.weight.bold     = 700

font.lineHeight.tight   = 1.15
font.lineHeight.snug    = 1.3
font.lineHeight.normal  = 1.5
font.lineHeight.relaxed = 1.65

font.tracking.tight   = -0.01em
font.tracking.normal  = 0
font.tracking.wide    = 0.02em
```

### Semantic (the names designers and developers pick)

```
font.role.display     # marketing hero / very large headlines
font.role.h1
font.role.h2
font.role.h3
font.role.h4
font.role.body        # default body
font.role.body-sm
font.role.label       # form labels, small UI
font.role.caption     # supporting microcopy
font.role.mono        # stat values, code
```

Each `font.role.*` is a *composite*: it references a `font.size.*`,
`font.weight.*`, `font.lineHeight.*`, and `font.tracking.*`. In Figma this
is a Text Style backed by those variables; in code it's the matching
Tailwind utility (`text-h2`, `text-body`, …).

Rules:

- `body` is the default. Don't introduce `body.default`; the absence of a
  modifier means default.
- Sizes use the centile scale (`100`, `200`, …) so you can insert without
  renumbering — `font.size.250` for a future 15px step is valid.
- A new `font.role.*` requires DS-owner approval. Sizes within an existing
  role are a normal PR.

---

## 4. Radius

Small closed scale; semantic names for app code.

### Primitive

```
radius.0    = 0
radius.xs   = 2px
radius.sm   = 4px
radius.md   = 8px
radius.lg   = 12px
radius.xl   = 16px
radius.2xl  = 24px
radius.full = 9999px
```

### Semantic

```
radius.control   # buttons, inputs, chips
radius.card      # cards, popovers, sheets
radius.pill      # fully rounded toggles / tags
radius.image     # avatars, media thumbnails
```

Rules:

- Tailwind utilities `rounded-control`, `rounded-card`, `rounded-pill` are
  generated from these semantic names — they must match exactly.
- Don't use primitive `radius.lg` in a component frame; pick the semantic
  that matches the role. If none fits, the role is missing.

---

## 5. Shadows (Elevation)

Shadows ladder by *role*, not by depth in pixels.

### Primitive (effect styles)

```
shadow.0   # none
shadow.1   # 0 1px 2px rgba(...)
shadow.2   # 0 2px 6px rgba(...)
shadow.3   # 0 8px 24px rgba(...)
shadow.4   # 0 20px 48px rgba(...)
```

### Semantic

```
elevation.flat       # default; no shadow
elevation.raised     # card / button-on-card lift
elevation.overlay    # popovers, dropdowns
elevation.modal      # dialogs, sheets
elevation.toast      # transient top-layer notifications
```

Rules:

- Light and dark modes use **different primitives** under the same
  semantic name. Dark-mode raised may use a 1px inner-light + outer-dark
  composite instead of a soft outer shadow — that's expected and the
  reason semantic naming wins.
- Never name an effect after color (`shadow.black-10`). Always after role
  (`elevation.raised`).

---

## 6. Breakpoints

Breakpoints are a constant, not a variable a designer picks. They're
recorded here so the name maps cleanly to the Tailwind config.

```
breakpoint.sm  = 640px
breakpoint.md  = 768px
breakpoint.lg  = 1024px
breakpoint.xl  = 1280px
breakpoint.2xl = 1536px
```

Rules:

- Use the `sm / md / lg / xl / 2xl` names everywhere — in Figma frame
  labels, in component responsive specs, in code. Don't write "mobile",
  "tablet", "desktop" in variable or component names; those terms are
  ambiguous across devices.
- Touch vs pointer is a *capability*, not a breakpoint, and is detected at
  runtime — don't conflate.
- Changing a breakpoint value is a `DESIGN_SYSTEM.md` PR, not a Figma-only
  edit.

---

## 7. Motion

Motion has two families: **duration** and **easing**. Composite roles are
the only names app code touches.

### Primitive

```
motion.duration.instant = 0ms
motion.duration.fast    = 120ms
motion.duration.base    = 200ms
motion.duration.slow    = 320ms
motion.duration.slower  = 480ms

motion.easing.standard  = cubic-bezier(0.2, 0, 0, 1)
motion.easing.enter     = cubic-bezier(0, 0, 0, 1)
motion.easing.exit      = cubic-bezier(0.4, 0, 1, 1)
motion.easing.spring    = cubic-bezier(0.5, 1.5, 0.5, 1)
```

### Semantic

```
motion.role.hover         # state transitions on interactive elements
motion.role.press         # active/pressed feedback
motion.role.enter         # element appearing
motion.role.exit          # element disappearing
motion.role.emphasis      # PR / streak / celebration moments
motion.role.reduced       # the fallback every animation must define
```

Rules:

- Every `motion.role.*` other than `reduced` declares its
  reduced-motion fallback in the variable description. `useReducedMotion()`
  in `@famm/ui` enforces it at runtime.
- No bare millisecond values in code. Pick a role.
- `emphasis` is reserved for earned moments (per principle #2 in
  `DESIGN_SYSTEM.md §2`). It's not a "make it pop" knob.

---

## 8. Names to avoid

Hard ban — these fail review:

- **Appearance-based color names.** `color.dark-gray`, `color.almost-black`,
  `color.brand-blue-ish`. Use intent (`color.text.primary`).
- **Component-coupled semantic names.** `color.button-bg`,
  `space.card-padding`. If it's truly per-component, it lives in
  `Component` (`button.primary.bg`), not `Semantic`.
- **Magic numbers in names.** `space.16`, `radius.8px`, `font.size.14`.
  Use scale indices (`space.4`) or semantic names (`font.role.body`).
- **Device names.** `breakpoint.mobile`, `space.phone`. Use the
  breakpoint key (`sm`).
- **Mode-encoded names.** `color.text.primary-dark`. The mode is a Figma
  Variable mode, not part of the name.
- **Brand colors as role names.** `color.surface.famm-blue` — surfaces
  don't change identity in dark mode, brand names do.
- **Marketing / copywriter names.** `color.electric-pulse`,
  `motion.snappy`. They drift, they're untranslatable, they bias review.
- **Plural vs singular drift.** `color.surfaces.default`,
  `spaces.inset.md`. Always singular: `color.surface.*`, `space.inset.*`.
- **Negation in names.** `color.text.not-disabled`. Name the positive case.
- **Numbered states.** `color.action.primary-1` /`-2`. Use the state
  (`-hover`, `-active`, `-disabled`).
- **Reserved words and punctuation.** No `default-default`, no `__`
  prefixes, no `#`, no `$`. Reserve those for build artifacts.

---

## 9. Modes for light / dark themes

Themes are **modes on a single Variable**, not separate variables.

Setup:

- Each Semantic and Component collection has the modes: `light`, `dark`.
- A future `high-contrast` mode is reserved. Name placeholder values
  identical to `light` until populated, so adding the mode later is a
  diff, not a rename.
- Primitives generally do **not** have modes — a primitive's value is the
  same regardless of theme. Exception: a small number of brand primitives
  may shift in dark mode to maintain contrast; document those explicitly.

Rules:

- The variable's *name* never changes between modes. `color.text.primary`
  is `color.text.primary` whether the resolved value is near-black or
  near-white. The mode is metadata, not part of the path.
- Every semantic color variable must define a value in **every** mode. A
  missing value is a publish blocker (per `FIGMA_GUIDE.md §3`).
- Aliases stay aliases across modes when possible. `color.text.primary`
  aliases `color.neutral.900` in light and `color.neutral.50` in dark —
  both aliases, no raw hex on the semantic.
- Mode switch in the app is `data-theme="dark"` on `<html>`. The CSS
  generated from these variables emits `:root { … }` and
  `[data-theme="dark"] { … }`. No JS theme provider, no inline styles.
- Don't introduce a third "dim" or "midnight" mode without DS-owner
  approval — every new mode multiplies the audit surface in
  `FIGMA_GUIDE.md §10`.

---

## 10. How to document token changes

Every token change — add, rename, deprecate, retire — leaves a paper
trail in three places.

### In Figma

- On the variable itself: fill the **Description** field. One sentence of
  intent ("text color for body copy on default surfaces"), plus the
  Tailwind utility it maps to (`text-text-primary`), plus the GitHub PR
  number once it exists.
- On the page: add a row to the Changelog page (`FIGMA_GUIDE.md §11`)
  under the next version entry. `Added`, `Changed`, `Deprecated`,
  `Removed`, `Fixed`.
- For deprecations: prefix the description with `🪦 Deprecated — use
  <replacement>. Removed in vX.Y.`

### In Git / GitHub

- A token change is one PR. The PR title is
  `tokens: add color.action.success` (or `rename`, `deprecate`, `remove`).
- The PR description includes:
  - Before / after token name and value table.
  - The Figma frame URL where the variable lives.
  - The Tailwind utility(ies) that change as a result.
  - The semver bump for `packages/ui` (`patch` for new tokens, `minor`
    for new families, `major` for renames / removals).
- The PR touches: `packages/ui/src/tokens/tokens.json` (generated, but
  the diff is reviewed), `packages/ui/CHANGELOG.md` once it lands, and
  `docs/DESIGN_SYSTEM.md` if a family is added.

### Renames and removals (the careful path)

1. Add the new name. Keep the old name as an alias of the new one.
2. Mark the old name `🪦 Deprecated` with a pointer to the new name.
3. Ship one minor release with both. Codemod usages in the app on the
   same release.
4. Remove the old name in the next minor. CI fails any new usage in the
   deprecation window via the lint rule in
   `packages/config/eslint/design-system.js`.

Never rename in place — it silently breaks every Figma file that
consumes the library.

---

## 11. How to keep Figma variables aligned with GitHub token files

Single source of truth is **Figma Variables**. Code is generated from
them, not the other way around. The pipeline (per
`DESIGN_SYSTEM.md §4.2`):

```
Figma Variables  ──[Tokens Studio export]──>  packages/ui/src/tokens/tokens.json
                                                       │
                                                       ▼
                                          build step (style-dictionary)
                                                       │
                ┌──────────────────────────────────────┼───────────────────────────┐
                ▼                                      ▼                           ▼
   packages/ui/src/tokens/tokens.css     packages/ui/tailwind.config.ts   packages/ui/src/tokens/tokens.ts
   (CSS custom properties)               (theme extension)                (typed consts)
```

Operating rules:

- **No hand-edits to `tokens.json` or the generated files.** The file
  header reads "GENERATED — do not edit." A nightly GitHub Action exports
  from Figma; an on-demand export is available via the
  `tokens: sync` workflow.
- **Diff review is mandatory.** Even though the JSON is generated, the
  PR opened by the export action requires a human approver. Reviewer
  checks: names match this document, no unexpected removals, modes
  populated for every semantic color.
- **CI diff check.** A PR that modifies `tokens.json` without a matching
  Figma export run is rejected — the workflow compares the JSON hash to
  the most recent export hash and fails on mismatch.
- **Name parity check.** A CI step asserts:
  - Every Tailwind utility consumed in `apps/web` resolves to a token in
    `tokens.json`.
  - Every semantic token in `tokens.json` has a corresponding Figma
    variable (via the export manifest).
  - No two tokens share a name across collections.
- **Versioning.** `packages/ui/package.json` version is bumped in the
  same PR as the export. The Figma library is published with that exact
  version string on the Cover page (`FIGMA_GUIDE.md §1`).
- **Drift detection.** A weekly job posts to the `#design-system`
  channel: any `🟡` variables (in Figma, not yet in code) or any code
  tokens not present in the most recent export. Empty output is the
  happy path.

If you find yourself wanting to edit `tokens.json` directly, stop and
file a Figma change instead — the export will pick it up. The one
exception is bootstrapping a brand-new token family before the Figma
variable exists; that requires DS-owner approval and a follow-up PR to
add the Figma side within 48 hours.

---

## Appendix — Quick reference table

| Family       | Primitive example          | Semantic example                | Tailwind utility            |
|--------------|----------------------------|---------------------------------|-----------------------------|
| Color        | `color.neutral.900`        | `color.text.primary`            | `text-text-primary`         |
| Color (bg)   | `color.neutral.0`          | `color.surface.default`         | `bg-surface-default`        |
| Spacing      | `space.4` (= 16px)         | `space.inset.md`                | `p-inset-md`                |
| Spacing (v)  | `space.6`                  | `space.stack.md`                | `gap-stack-md`              |
| Typography   | `font.size.300`            | `font.role.body`                | `text-body`                 |
| Radius       | `radius.md`                | `radius.control`                | `rounded-control`           |
| Shadow       | `shadow.2`                 | `elevation.raised`              | `shadow-raised`             |
| Breakpoint   | `breakpoint.md`            | (same)                          | `md:` prefix                |
| Motion       | `motion.duration.base`     | `motion.role.enter`             | `transition-enter`          |

When in doubt: the semantic column is what you reach for. The primitive
column is plumbing.
