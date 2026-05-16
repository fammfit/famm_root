# Motion

Motion is reserved for moments that earn it (principle 2). Most of the
product should be still. When something *does* move, it follows this file.

## Tokens

Use the motion tokens — never raw `ms` values.

| Token | Value | When |
|-------|-------|------|
| `duration-instant` | 0ms | Reduced-motion fallback, instant state swaps. |
| `duration-fast` | 120ms | Hover/focus state transitions, button press, focus rings. |
| `duration-base` | 200ms | Default for component state changes, modal/sheet open. |
| `duration-slow` | 320ms | Page transitions, complex composed animations. |
| `easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default. Decelerates into rest. |
| `easing-emphasized` | `cubic-bezier(0.3, 0, 0, 1.2)` | Signature moments (PR, completion). Subtle overshoot. |

Tailwind: `duration-fast`, `ease-standard`, etc.

## When to animate

| Allowed | Not allowed |
|---------|------------|
| Hover/focus state on interactive elements | Hover on non-interactive elements |
| Modal/sheet entry & exit | Page chrome (header, nav) pulsing |
| Toast in/out | Cards "lifting" on hover by default |
| Loading skeleton shimmer | Brand color cycling |
| PR celebration (one-time) | Auto-playing decorative loops |
| Set-complete checkmark draw | Parallax scrolling |

If you can't fit your animation into the left column, default to no
animation. The bar for adding motion is high.

## Reduced motion

- Branch on `useReducedMotion()` from `@famm/ui`.
- Tokens already collapse `--duration-*` to 0ms inside the
  `prefers-reduced-motion: reduce` media query — so animations driven purely
  by token durations become instant for free.
- Animations driven by `transform: translate(...)` or `keyframes` must
  branch explicitly. A reduced variant either snaps directly to the end
  state or fades only.

## Signature motions

A short, named library. Use these by name; do not redefine them.

### `state-snap`
Instant change. Used for filter toggles, accordion open without ceremony.
- duration: `instant`

### `state-fade`
Opacity change only.
- duration: `fast`
- easing: `standard`
- properties: `opacity`

### `sheet-enter`
Bottom sheets and side sheets on entry.
- duration: `base`
- easing: `standard`
- properties: `transform` (translateY/X), `opacity`
- reduced-motion variant: `state-fade` only.

### `pr-celebrate`
Personal-record moment. Used once per achievement.
- duration: `slow`
- easing: `emphasized`
- properties: `transform: scale(1) → 1.06 → 1`, `color: text-primary → signal-pr → signal-pr`.
- reduced-motion variant: color change only, no scale.
- Pairs with haptic on touch viewports.

### `set-complete`
Set checkbox flipping to checked.
- duration: `base`
- easing: `standard`
- properties: `stroke-dashoffset` (checkmark draw), `transform: scale`.
- reduced-motion variant: instant fill, no draw.

## Performance

- Animate `transform` and `opacity` only when possible. Avoid animating
  `width`, `height`, `top`, `left`.
- Use `will-change` sparingly and only for the duration of the animation.
- Stop animations off-screen — pause timers when their surface is not
  visible.
- 60fps on the smallest supported phone is the bar. If it drops frames
  there, simplify.

## Sound and haptics

- **No sound** in product surfaces. The user is often listening to music.
- **Haptics** are allowed on touch viewports for:
  - Set complete (`light`).
  - Workout complete (`success`).
  - PR achievement (`success`).
- Never on idle UI changes (toggle off → on, tab switch, etc.).
