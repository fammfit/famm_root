<!--
  Keep summaries tight. Reviewers should be able to grasp the change in 30
  seconds. Link the design ticket / Figma frame / issue rather than
  re-explaining context.
-->

## Summary

<!-- 1-3 bullets. What changed and why. -->

## Test plan

<!-- How you verified it. Include commands run, screens covered. -->

- [ ]
- [ ]

## UI checklist

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
