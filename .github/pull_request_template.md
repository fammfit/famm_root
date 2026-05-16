<!--
FAMM Fitness — Pull Request

This template is mandatory. Empty / skipped sections will be flagged
by review. The checklists exist to prevent inconsistent AI-generated
UI from being merged; every box must be honestly checked.

The merge gate: a PR is mergeable when all "blocks merge" items are
satisfied AND the relevant reviewers have approved per CODEOWNERS.
-->

## 1. Summary

<!--
1–3 sentences. What changes, why now. Link to the issue / Linear /
roadmap item for "why" if it's not obvious. Do not paste a list of
commit messages.
-->

## 2. Screenshots or screen recording

<!--
UI changes REQUIRE screenshots or a screen recording — empty section
is not acceptable. Include:

- Light theme + dark theme
- Mobile (≤sm) + desktop (≥md)
- Empty / loading / error states if the surface has them
- Before / after if you changed an existing surface

For interaction changes (open/close, focus, transitions), attach a
short screen recording (≤ 30s). GIFs are fine; native screen
recordings are better.

If this PR is backend-only or docs-only, write "N/A — no UI changes"
and explain.
-->

## 3. Design-system files reviewed

<!--
List the docs you opened while making this change. Checking a box
without opening the file is a review failure.
-->

- [ ] `docs/DESIGN_SYSTEM.md` (strategy, principles, governance)
- [ ] `docs/FIGMA_VARIABLES.md` (token naming)
- [ ] `docs/design-system/components/<relevant>.md` — list:
- [ ] `docs/design-system/patterns/<relevant>.md` — list:
- [ ] `packages/ui/src/components/primitives/` — files inspected:
- [ ] `packages/config/eslint/design-system.js` (lint rules)

## 4. Components changed

<!--
Every primitive/pattern/feature component touched, by path. Include
both code and Figma changes. For new components, note the tier
(L1 primitive / L2 pattern / L3 feature).
-->

| Path | Tier | Change kind |
|------|------|-------------|
|      |      | added / variant added / variant renamed / deprecated / removed / refactored |

If a variant or prop was **renamed** or **removed**, list the
migration path:

<!-- e.g. "Button: variant 'primary' renamed to 'default'; consumers
in apps/web migrated in this PR." -->

## 5. Tokens changed

<!--
If `packages/ui/src/tokens/tokens.json` (or any generated token file)
changed, list the tokens here. Match names exactly to
`docs/FIGMA_VARIABLES.md`.
-->

- [ ] No tokens changed.
- [ ] Tokens added: <list>
- [ ] Tokens renamed: <list, old → new, with deprecation plan>
- [ ] Tokens removed: <list, with deprecation window history>
- [ ] Figma Variables side updated in the same release (manifest hash
      matches; verified by CI diff).

## 6. Accessibility checklist (blocks merge if unchecked)

<!--
Every box below is required for UI changes. Don't check it unless
you've actually verified.
-->

- [ ] Semantic HTML used (no `<div onClick>`; `<button>` for actions,
      `<a>` for navigation)
- [ ] Every interactive element keyboard-reachable in DOM order
- [ ] Visible focus ring on every interactive element (uses
      `color.border.focus`); never `outline: none` without
      replacement
- [ ] Form fields have programmatic labels (via `FormField` or
      explicit `<label htmlFor>` / `aria-label`)
- [ ] Errors render on the field with `role="alert"` and
      `aria-describedby`; `aria-invalid="true"` set
- [ ] Icon-only buttons have `aria-label` (or `aria-labelledby`);
      decorative icons inside labeled buttons have `aria-hidden`
- [ ] Modals trap focus, restore focus on close, respond to `Esc`,
      carry `aria-modal="true"`
- [ ] Color contrast verified (rely on tokens; if you bypass tokens,
      attach the contrast result)
- [ ] State changes (loading, success, error) announced via the
      appropriate live region (`role="status"`, `role="alert"`,
      `aria-busy`)
- [ ] Reduced-motion fallback present for any animation > 200ms or
      involving translation (gates on `useReducedMotion()`)
- [ ] Touch targets ≥ 44×44 on touch viewports
- [ ] `npm run lint` (a11y rules included) passes locally
- [ ] `axe-core` / Vitest a11y assertions pass for new components

## 7. Responsive QA checklist (blocks merge if unchecked)

<!-- Required for any change touching apps/web UI or packages/ui. Delete
     this whole section for backend-only PRs. Rules:
     - design-system/principles.md, ux-rules.md, accessibility.md
     - .cursor/rules/05-review-checklist.mdc -->

- [ ] No raw color/space/radius values introduced (no hex, px, rgb()).
- [ ] No Tailwind default palette in new code (`gray-*`, `red-*`, etc.).
- [ ] Reused existing L1/L2 components where applicable.
- [ ] New/changed components have Figma counterparts; link below.
- [ ] A11y: keyboard, focus, contrast, reduced motion, labels verified.
- [ ] Responsive: verified at `sm` / `md` / `lg` minimum.
- [ ] Screenshots: light + dark, mobile + desktop.
- [ ] If tokens or components changed: `design-system/changelog.md`
      updated.
- [ ] Figma link:
- [ ] Verified at `sm` (360 width)
- [ ] Verified at `md` (768 width)
- [ ] Verified at `lg` (1280 width)
- [ ] No horizontal scroll at any breakpoint (unless explicitly a
      horizontal scroller)
- [ ] Touch interactions verified on a real device or DevTools touch
      emulation
- [ ] Long content (i18n stress test: ~30% length growth) does not
      overflow
- [ ] Loading skeletons match the responsive shape of the populated
      content

## 8. AI usage disclosure

<!--
Required. Honesty here is more important than the answer. AI-generated
UI is fine; AI-generated UI that bypasses the design system is not.
-->

- [ ] No AI assistance used for this PR.
- [ ] AI used for code generation. Tools / scope:
      <e.g. "Cursor / Claude — wrote the initial dashboard layout">
- [ ] AI used for copy / content. Tools / scope:
- [ ] AI used for tests. Tools / scope:
- [ ] AI-generated code was reviewed line-by-line before pushing.
- [ ] AI did not introduce: raw colors, raw spacing, raw `style={}`,
      forked primitives, new dependencies, or unreviewed text content.

If AI generated UI, confirm explicitly that the output uses
`@famm/ui` primitives and semantic tokens only (no shadcn / Radix /
MUI / Mantine / Tailwind UI bare snippets).

## 9. Figma link

<!--
Required for any UI change. "N/A — no UI changes" is the only valid
empty value.
-->

Figma frame / component:

If a new component or variant was added in code, link to the matching
Figma frame; CI compares the export manifest against `tokens.json`.

## 10. GitHub / Linear issue link

Closes #
Related to #

## 11. Risks or assumptions

<!--
Be specific. "I assume the payments service handles X" / "this might
regress the trainer dashboard." Reviewers will look here first when
deciding whether to deep-test.
-->

- Risk:
- Assumption:
- Roll-back plan:

## 12. Reviewer notes

<!--
What to look at first. Tricky bits, places you want a second pair of
eyes, decisions you'd like to be challenged on.
-->

- Look here first:
- I'm not sure about:
- Open for feedback on:

---

### Merge gate summary

<!--
The PR cannot merge unless ALL of the following are true:
-->

- [ ] §2 Screenshots present (or "N/A — no UI changes" justified)
- [ ] §3 At least one design-system file reviewed
- [ ] §6 All accessibility boxes checked
- [ ] §7 All responsive boxes checked
- [ ] §8 AI usage disclosed honestly
- [ ] §9 Figma link present (or "N/A — no UI changes" justified)
- [ ] CI green: lint, typecheck, test, a11y, design-system token check
- [ ] CODEOWNERS approvals satisfied
