---
description: Accessibility review of a file, folder, or PR diff against WCAG 2.2 AA.
argument-hint: <path or "diff">
---

# /review-accessibility

Run an accessibility review of `$ARGUMENTS`. Baseline is **WCAG 2.2 AA**.

If `$ARGUMENTS` is `diff`, review the current git diff against `main`. If
it's a path, review that file or folder. If empty, ask.

## Steps

1. **Resolve the scope.**
   - `diff` → run `git diff --name-only origin/main...HEAD` and review the
     changed files. If no remote, use `main`.
   - path → walk the path and include `*.tsx` and `*.ts` files.

2. **Read each file** and check against the categories below. For each
   finding, capture: file, line, what's wrong, what to do.

### Keyboard

- Every interactive element reachable by Tab?
- `<div onClick>` / `<span onClick>` without `role`, `tabIndex`, and
  key handlers?
- Escape behavior on modals / popovers?
- Tab order matches visual order?

### Focus

- `outline-none` / `outline: none` without a replacement?
- Focus rings present and visible against the actual background?
- `autoFocus` used? (jsx-a11y bans this — should be intentional.)

### Names

- Every `<button>`, `<a>`, `<input>` has a visible label or `aria-label`?
- Icon-only buttons have `aria-label`?
- Decorative icons have `aria-hidden="true"`?

### Live regions & alerts

- Timers, set counters, async state changes — wrapped in `aria-live`?
- Error messages have `role="alert"` (or live in an alert region)?

### Forms

- Every input has an associated `<label>` (via `FormField` or htmlFor)?
- Required fields marked with `aria-required` (and visually)?
- Errors associated via `aria-describedby` and have `aria-invalid="true"`?
- Autocomplete attributes set where applicable?

### Touch targets

- Interactive elements at least 44×44 on touch viewports?
- Icon-only controls have a 44×44 hit area via padding even if the icon
  is smaller?

### Motion

- Animations branch on `useReducedMotion()` when > 200ms or involve
  translation?
- No auto-playing video, no parallax, no infinite loops (other than
  active loading)?

### Color & contrast

- Errors carry a non-color signal (icon or label)?
- PR state carries a label, not just gold color?
- Required fields have an asterisk, not just a red border?

### Modals & dialogs

- `aria-modal="true"`?
- `aria-labelledby` pointing at the title?
- Focus trapped while open?
- Focus restored on close?

## Report shape

Produce findings in this exact format:

```
## A11y review: <scope>

### Blockers (would fail WCAG 2.2 AA)
- <file>:<line> — <what> → <fix>

### Important (real-world impact)
- <file>:<line> — <what> → <fix>

### Polish (nice-to-have)
- <file>:<line> — <what> → <fix>

### Out of scope but worth flagging
- <observations about adjacent code>

### Summary
- <N> blockers, <N> important, <N> polish.
- Quick wins: <list>.
- Verify manually: <what the user must test themselves — keyboard pass,
  screen reader pass, etc.>
```

## Rules of engagement

- **Do not modify any files** in this command. Report only.
- **Don't claim something is fixed** — claim only what you read.
- **Note what you couldn't verify** — focus visibility, tab order in a
  rendered page, screen reader behavior — these need manual testing.

## Reference

- `design-system/accessibility.md` — the binding rules.
- `.cursor/rules/03-accessibility.mdc` — the AI-facing summary.
