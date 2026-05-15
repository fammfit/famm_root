---
description: Audit a file, folder, or feature for design-system drift and report findings.
argument-hint: <path or feature name>
---

# /audit-ui

You are auditing the target for design-system compliance. Target:

**`$ARGUMENTS`**

If `$ARGUMENTS` is empty, ask the user for a path or feature name and stop.

## Steps

1. Resolve the target.
   - If it's a path, audit that file or folder.
   - If it's a feature name (e.g. "bookings"), grep
     `apps/web/src/components/` and `apps/web/src/app/` for related files
     and audit them together.

2. For each file in scope, scan for:

   **Token drift**
   - Raw hex colors (`#[0-9a-fA-F]{3,8}`).
   - Raw `px` literals in strings.
   - `rgb(`, `rgba(`, `hsl(`, `hsla(` literals.
   - Inline `style={{ ... }}` outside `packages/ui/src/components/primitives/`.
   - Tailwind default palette in className strings (`bg-gray-*`,
     `text-red-*`, `border-gray-*`, etc.).

   **Component drift**
   - Duplicated components — e.g. `Button.tsx` in `apps/web/src/components`
     while `@famm/ui` exports `Button`.
   - Bare `<input>`, `<label>`, `<button>` instead of the primitives.
   - Icon imports from libraries other than `lucide-react`.

   **A11y red flags**
   - `<div onClick>` or `<span onClick>` without `role` + key handlers.
   - `outline-none` / `outline: none` without a focus-ring replacement.
   - Missing `aria-label` on icon-only buttons.
   - Animations that don't branch on `useReducedMotion()`.

   **Content / UX**
   - Title Case on buttons/labels (should be sentence case).
   - Placeholder-only inputs (no `<label>` or `FormField`).
   - "Click here", "OK", "Submit" as button labels.

3. Produce a **prioritized report** in this exact shape:

```
## Audit: <target>

### Critical (CI would fail)
- <file>:<line> — <issue> → <fix>

### High (drift, fix before next ship)
- <file>:<line> — <issue> → <fix>

### Medium (cleanup)
- <file>:<line> — <issue> → <fix>

### Low (nice-to-have)
- <file>:<line> — <issue> → <fix>

### Summary
- <N> critical, <N> high, <N> medium, <N> low
- Suggested order of work: <one-line plan>
```

4. **Do not modify any files.** This command audits only. If the user
   wants you to fix something, they will follow up with
   `/refactor-component` or a direct request.

## Reference

- `design-system/principles.md` — for prioritization.
- `design-system/accessibility.md` — for a11y rules.
- `.cursor/rules/02-component-rules.mdc` — for anti-patterns list.
- `.cursor/rules/04-design-tokens.mdc` — for token usage.
