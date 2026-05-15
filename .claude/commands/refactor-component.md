---
description: Migrate an existing component to design-system tokens and conventions.
argument-hint: <path to component>
---

# /refactor-component

Refactor the component at `$ARGUMENTS` to comply with the design system.
This command is for **migrating drift**, not redesigning.

If `$ARGUMENTS` is empty, ask the user for the path and stop.

## Rules of engagement

- **Behavior parity.** The refactored component must look and behave the
  same in light mode at the default density. If a behavior changes, call
  it out explicitly in your summary.
- **Public API parity** if possible. If a prop name has to change (e.g.
  `color="red"` → `tone="danger"`), update all call sites in the same
  diff.
- **No new features.** Do not add variants or props during a refactor.
  Open a follow-up.

## Steps

1. **Read the file.** Understand its current props, variants, and usage.

2. **Identify violations** — work top-down through this list:

   1. Raw hex / `px` / `rgb()` / `hsl()` in strings.
   2. Inline `style={{ ... }}`.
   3. Tailwind default palette utilities (`bg-gray-*`, `text-red-*`,
      `border-gray-*`).
   4. Bare `<input>`, `<label>`, `<button>` that should be primitives.
   5. Touch targets below 44×44.
   6. Missing focus rings (`outline-none` without replacement).
   7. Icon-only controls without `aria-label`.
   8. Animations not branching on `useReducedMotion()`.
   9. Duplicate component (same purpose as something in `@famm/ui`).

3. **For duplicates** — if this file is a fork of an existing primitive
   (e.g. `apps/web/src/components/ui/Button.tsx` while `@famm/ui` exports
   `Button`):
   - Do not refactor in place.
   - Show the user a migration plan: replace usages with `@famm/ui`'s
     export, delete the duplicate.
   - Ask for confirmation before executing the deletion.

4. **For drift** — refactor in place using semantic tokens:

   | Replace | With |
   |---------|------|
   | `bg-white` | `bg-surface` (or `bg-surface-raised`) |
   | `bg-gray-50` / `bg-gray-100` | `bg-surface-sunken` |
   | `text-gray-900` | `text-text-primary` |
   | `text-gray-700` / `text-gray-500` | `text-text-secondary` / `text-text-muted` |
   | `border-gray-200` / `border-gray-300` | `border-border-subtle` / `border-border` |
   | `bg-brand-600` / `bg-blue-600` | `bg-accent` |
   | `bg-red-600` | `bg-signal-danger` |
   | `bg-green-600` | `bg-signal-success` |
   | `rounded-md` | `rounded-control` |
   | `rounded-lg` | `rounded-card` |
   | `rounded-full` | `rounded-pill` |
   | `p-4` / `p-6` | `p-inset-md` / `p-inset-lg` |
   | `space-y-2` / `gap-4` | `gap-stack-sm` / `gap-stack-md` |
   | `duration-150` / `200` | `duration-fast` / `base` |

   For values that don't have a clean mapping, **stop and ask** rather
   than guessing.

5. **Run the gates:**
   - `npm run lint` on the changed files.
   - `npm run typecheck`.
   - `npm run tokens:check` (in case the refactor required token
     additions).
   - If any fail, fix or explain — don't silence rules.

6. **Summary to the user:**
   - List the violations found and what you changed.
   - Note any behavior changes (there shouldn't be any).
   - Note follow-ups (new variants the original had that don't fit
     cleanly).

## Reference

- Token map: `.cursor/rules/04-design-tokens.mdc`
- Anti-patterns: `.cursor/rules/02-component-rules.mdc`
- A11y rules: `.cursor/rules/03-accessibility.mdc`
