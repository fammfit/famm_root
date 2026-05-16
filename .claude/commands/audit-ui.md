---
description: Audit selected UI files against the FAMM design system
argument-hint: <files-or-glob>
---

# /audit-ui

Audit the UI files in `$ARGUMENTS` against the FAMM design system and
produce a structured report. Do **not** modify files — this command is
read-only. The user will request a follow-up to apply fixes.

## Scope

Audit only the files matched by `$ARGUMENTS` (a path, a glob, or a
comma-separated list). If no arguments are given, audit the
currently-staged or recently-changed files (`git diff --name-only`).

If a file path resolves to a directory, audit every `.tsx` / `.ts` /
`.css` file inside it recursively.

## Reference material (read these first)

Open and skim before auditing:

1. `docs/DESIGN_SYSTEM.md` — strategy, principles, governance tiers.
2. `docs/FIGMA_VARIABLES.md` — token naming and the allowed semantic
   families.
3. `docs/design-system/components/` — per-component specs (variants,
   states, a11y, content rules).
4. `docs/design-system/patterns/` — per-pattern specs.
5. `packages/ui/src/components/primitives/` — actual primitives.
6. `packages/ui/src/components/patterns/` — actual L2 patterns.
7. `packages/config/eslint/design-system.js` — the lint rules CI
   enforces.

If any of these are missing, note it in the report under
**Reference gaps** but continue.

## Checks (perform all twelve)

For each file in scope:

1. **Token usage.** Find raw values that should be tokens:
   `#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(`, raw `px` /`rem` /`em`
   units in `className`, raw ms / s durations, raw `cubic-bezier(`.
   Anything hard-coded that has a semantic token equivalent.

2. **Component reuse.** Detect raw markup that should be a primitive:
   - `<button` outside `packages/ui/src/components/primitives/button.tsx`.
   - `<input` outside `primitives/input.tsx`.
   - `<select`, `<dialog>` anywhere in `apps/web`.
   - "Card-shaped" `<div className="rounded ... shadow ...">`.
   - "Pill" `<span className="rounded-full ...">` outside Badge.
   For each, suggest the `@famm/ui` primitive to use.

3. **Accessibility.** Surface issues — see §1 of
   `/.claude/commands/review-accessibility.md` for the full list.
   Highlight at minimum: missing labels, missing alt, icon-only buttons
   without `aria-label`, removed focus rings, missing live regions,
   incorrect heading nesting.

4. **Responsive behavior.** Flag components that hard-code widths
   (`w-[300px]`), don't compose responsively (`md:` / `lg:` missing
   on a layout that needs to reflow), or use device-named
   breakpoints (`mobile:`, `desktop:`).

5. **Visual hierarchy.** Multiple H1s in a route. Headings skipping
   levels (H1 → H3). Two `Button variant="default"` on the same
   surface. Stat values that aren't visually loudest in their card.

6. **Content clarity.** Button labels like "Submit", "OK", "Click
   here". Placeholders being used as labels. Title-case where
   sentence-case is the rule. "Loading…" / "Error" / "Oops"
   non-specific copy.

7. **Inconsistent spacing.** Mixing `space.inset.*` axes with raw
   `p-*` / `m-*` / `gap-*`. Different gap values for visually
   equivalent surfaces. Any `space-y-N` / `gap-N` where N is a raw
   number rather than a `stack-*` / `inline-*` token.

8. **Inconsistent typography.** `text-[14px]`, `text-sm` next to
   `text-[15px]` on equivalent text, custom `font-family` overrides,
   raw `font-weight` (`font-[450]`), inline `style={{ fontSize }}`.

9. **Unnecessary custom CSS.** Inline `style={}` outside L1
   primitives. CSS-in-JS one-offs. `<style>` blocks inside
   components. `!important` anywhere.

10. **One-off components.** Components in `apps/web/src/components/`
    that duplicate `@famm/ui` primitives. Files like `MyButton.tsx`,
    `CustomCard.tsx`, `PillTag.tsx`. Anything with the word "custom"
    in the name is suspect.

11. **Duplicate styles.** Two components that produce the same visual
    via different `className` strings. Repeated 5+ line `className`
    strings across files — extract to a primitive or a pattern.

12. **Missing states.** Compare each interactive component to its doc
    in `docs/design-system/components/`. Flag missing: `hover`,
    `focus-visible`, `active`, `disabled`, `loading`, `error`.
    Especially: focus rings removed (`outline-none` /
    `focus:ring-0`).

## Output format

Produce a single Markdown report with this exact shape:

```
# UI Audit Report

## Summary
- Files audited: <count>
- Critical issues: <count>
- Moderate issues: <count>
- Minor issues: <count>
- Top-level finding: <one sentence>

## Critical issues
<for each: severity tag, file:line, what's wrong, why it matters>

## Moderate issues
<same format>

## Minor issues
<same format>

## Recommended fixes
<grouped by theme — tokens, primitives, a11y, copy, etc.
each entry: a one-line "what to do" + "where">

## Files that need changes
<bullet list of file paths, deduped, with a one-line summary per file>

## Suggested implementation order
1. <highest-leverage / blocking change>
2. <next>
3. <next>
...
<order is: a11y blockers → token violations → component reuse →
spacing / typography → copy → cleanup>

## Reference gaps
<any docs you couldn't find that this audit would have benefited from>
```

## Severity rubric

- **Critical.** Blocks merge under design-system policy: a11y
  violations, removed focus rings, raw hex colors, missing labels,
  forked primitives, custom modals, missing required ARIA.
- **Moderate.** Should fix before merge: spacing drift, typography
  drift, missing states (hover / loading), one-off components that
  duplicate primitives.
- **Minor.** Cleanup: long `className` strings that could be a
  primitive, slightly off copy, inconsistent file naming.

## Tone

Be specific. Quote the offending code or the className. Reference the
relevant spec by path (`docs/design-system/components/button.md §5`).
Never write "consider improving" — write "replace X with Y at
path:line".

## Do not

- Do not modify any files.
- Do not run codemods.
- Do not propose framework migrations.
- Do not invent components that don't exist.
- Do not skip the twelve checks; if a check has zero findings, say so
  explicitly.
