---
description: Guided creation of a new component at the correct tier (L1 / L2 / L3).
argument-hint: <ComponentName> [purpose]
---

# /create-component

Create a new component named `$ARGUMENTS`. Follow this flow carefully — do
not skip the reuse step.

## Steps

1. **Parse the request.**
   - First arg: component name in PascalCase.
   - Remaining args: a short description of what it's for.
   - If the name is missing, ask the user for it and stop.

2. **Reuse check — do this before anything else.**
   - Grep `packages/ui/src/components/{primitives,patterns}` for similar
     names and similar purposes.
   - If you find a near-match, **stop and propose extending its variants**
     rather than creating a new component. Show the diff you would make
     and ask the user to confirm.

3. **Pick the tier** (ask the user if unclear):

   | Question | Answer → Tier |
   |----------|---------------|
   | Will more than one feature use it? | Yes → L2, No → L3 |
   | Is it a new atomic primitive (button, input, etc.)? | Yes → L1 (STOP, ask for DS-owner approval) |
   | Is it page-specific? | Yes → L3 |

4. **Pick the location:**
   - L1: `packages/ui/src/components/primitives/<kebab-name>.tsx` —
     **only after DS-owner approval**.
   - L2: `packages/ui/src/components/patterns/<kebab-name>.tsx`.
   - L3: `apps/web/src/components/<feature>/<kebab-name>.tsx`.

5. **Scaffold the component.** Follow these conventions:
   - File name kebab-case; component name PascalCase.
   - `React.forwardRef` when wrapping an HTML element.
   - Use `cva()` for variants, `cn()` from `@famm/ui` for className.
   - Export prop types as named types (`<Name>Props`).
   - Semantic tokens only — no hex/px/rgb, no inline `style={}`.
   - Touch targets 44×44 minimum on interactive elements.
   - `useReducedMotion()` if it animates.

6. **Wire it up:**
   - L1/L2: add a named export to `packages/ui/src/index.ts`.
   - L3: import directly from the feature.

7. **Document:**
   - L1: add a row to `design-system/components/README.md` and create
     `design-system/components/<name>.md` from the contract template.
   - L2: same in `design-system/patterns/`.
   - Add a `### Added` entry to `design-system/changelog.md` under
     `[Unreleased]`.

8. **Confirm to the user**, listing exactly:
   - Files created and their paths.
   - Where it was exported from.
   - Doc / changelog entries added.
   - **What's left for them**: tests, Figma frame, screenshots in the PR.

## Reference

- Tier model: `.cursor/rules/01-ux-ui-system.mdc`
- Conventions: `.cursor/rules/02-component-rules.mdc`
- Tokens: `.cursor/rules/04-design-tokens.mdc`
- A11y: `.cursor/rules/03-accessibility.mdc`
