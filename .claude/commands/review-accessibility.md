---
description: Review selected files for accessibility issues against WCAG 2.2 AA
argument-hint: <files-or-glob>
---

# /review-accessibility

Review the files in `$ARGUMENTS` for accessibility issues against
WCAG 2.2 AA and the FAMM design system's a11y rules (see
`docs/DESIGN_SYSTEM.md §5`). This command is read-only — return a
report; do not modify files.

If `$ARGUMENTS` is empty, default to the currently-staged or
recently-changed files (`git diff --name-only`).

If a path resolves to a directory, walk it recursively for `.tsx` /
`.ts` / `.html` / `.mdx` files.

## Reference material

Before reviewing, skim:

- `docs/DESIGN_SYSTEM.md §5` — the FAMM a11y rules.
- `docs/design-system/components/` — per-component a11y requirements
  (especially button.md, input.md, modal.md, navigation.md, table.md,
  tooltip.md).
- `docs/design-system/patterns/` — pattern-level a11y notes
  (onboarding, contact-form, error-states, loading-states).

If `docs/design-system/accessibility.md` exists, use it as the primary
reference; otherwise rely on `DESIGN_SYSTEM.md §5`.

## Checks (perform all twelve)

For every file in scope:

1. **Semantic HTML.** Flag `<div>` or `<span>` rendering an
   interactive role that should be a real element: `<div onClick>`
   → `<button>`; `<div role="button">` → `<button>`; `<a>` without
   `href` used as a button → `<button>`. Verify `<main>`, `<nav>`,
   `<header>`, `<footer>`, `<section>` are used where appropriate.

2. **Button and link usage.** A `<button>` that navigates → should
   be `<Link>`. An `<a href>` that performs an action → should be
   `<Button>`. The rule: if `onClick` is the only behavior, it's a
   button; if it changes the URL, it's a link.

3. **Keyboard navigation.** Every interactive element reachable via
   `Tab`. No `tabIndex` greater than 0 (it breaks document order).
   Custom widgets implement the WAI-ARIA pattern (Tabs, Accordion,
   Combobox) — flag any that don't handle Arrow / Home / End / Esc.

4. **Focus states.** No `outline: none`, `focus:ring-0`,
   `focus-visible:outline-none` without a replacement focus ring.
   Every interactive element has a visible focus ring using
   `color.border.focus`.

5. **ARIA usage.** Required ARIA present (`aria-expanded` on
   triggers, `aria-controls`, `aria-current`, `aria-pressed`).
   No invalid combinations (`aria-label` on an element with visible
   text that doesn't match; `role="button"` on a `<button>`).
   `aria-hidden="true"` on decorative icons only.

6. **Form labels.** Every `<input>`, `<select>`, `<textarea>` has a
   programmatic label via `<label htmlFor>`, `aria-label`, or
   `aria-labelledby`. Placeholders are not labels. Required fields
   have a visible required mark **and** the `required` attribute.

7. **Error message associations.** Per-field errors carry
   `role="alert"` and are referenced from the input via
   `aria-describedby`. `aria-invalid="true"` set when the field is
   in error.

8. **Modal focus trapping.** Every `<dialog>` / `role="dialog"` traps
   focus while open, restores focus to the trigger on close,
   responds to `Esc`, and has `aria-modal="true"`. Custom modals
   without these are critical issues.

9. **Color contrast assumptions.** Flag direct color usage that
   bypasses tokens — those tokens are contrast-validated, raw colors
   are not. Highlight `text-white` on tinted backgrounds, low-opacity
   text overlays on imagery, and `text-gray-400` / similar where a
   semantic token would have stricter contrast guarantees.

10. **Icon-only controls.** Every icon-only `<button>` or
    `IconButton` has `aria-label` (or `aria-labelledby`). Decorative
    icons inside labeled controls have `aria-hidden="true"`.

11. **Alt text.** Every `<img>` and `next/image` has `alt`.
    Decorative images: `alt=""`. Content images: meaningful
    description, not "image of". Flag any image with the word "image"
    or "photo" in its alt.

12. **Reduced motion support.** Any animation longer than 200ms or
    involving translation has a reduced-motion fallback. Look for
    `transition-*`, `animate-*`, framer-motion, or
    `requestAnimationFrame` usage that does not gate on
    `useReducedMotion()` from `@famm/ui` or a
    `@media (prefers-reduced-motion: reduce)` rule.

## Output format

Produce one Markdown report with this exact shape:

```
# Accessibility Review

## Summary
- Files reviewed: <count>
- Issues by severity: <critical> critical, <moderate> moderate, <minor> minor
- Merge status: <blocks merge | safe to merge with fixes | safe to merge>
- One-line headline: <top finding>

## Critical issues (blocks merge)
For each issue:
- **<short title>**
  - File: `<path>:<line>`
  - What: <one-sentence description>
  - WCAG / FAMM rule: <e.g. WCAG 2.4.7 Focus Visible / DESIGN_SYSTEM.md §5>
  - Code:
    ```tsx
    <offending snippet>
    ```
  - Suggested fix:
    ```tsx
    <minimal corrected snippet>
    ```
  - Blocks merge: yes

## Moderate issues
<same format; blocks merge: no, but fix before release>

## Minor issues
<same format; blocks merge: no>

## Summary table
| File | Critical | Moderate | Minor |
|------|----------|----------|-------|
| ...  |          |          |       |

## Recommended order
1. <highest leverage fix>
2. <next>
3. <next>
```

## Severity rubric

- **Critical (blocks merge).**
  - Missing form label.
  - Missing alt on a meaningful image.
  - Removed focus ring.
  - Icon-only button without `aria-label`.
  - Modal without focus trap or `Esc` close.
  - Interactive `<div>` with no keyboard handling.
  - Forms that lose user input on error.
- **Moderate (must fix before release).**
  - Heading hierarchy skips levels.
  - Missing live region on dynamic content.
  - Color-only state indication.
  - Reduced-motion fallback missing.
  - `aria-label` that doesn't match visible text.
  - Touch targets under 44×44 on touch viewports.
- **Minor (cleanup).**
  - Long alt text that could be shorter.
  - Redundant ARIA (`role="button"` on `<button>`).
  - Slightly off semantic element (`<div>` where `<section>` would
    be more appropriate but the page works).

## Tone

- Reference the line of code. Don't paraphrase.
- Cite the relevant WCAG criterion and the FAMM doc section.
- Provide a minimal corrected snippet — small enough to drop in.
- Mark each issue as `Blocks merge: yes` or `no` explicitly.

## Do not

- Do not modify files.
- Do not "fix" issues by suggesting `aria-hidden` on interactive
  elements.
- Do not recommend skipping a check because "the design system
  hasn't shipped X yet" — flag it and recommend the documented
  primitive as the fix path.
- Do not skip checks; if a check has zero findings, say "No issues
  found for §<n>." explicitly.
