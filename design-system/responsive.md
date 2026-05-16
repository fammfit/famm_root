# Responsive Design

Mobile-first. Default styles target the smallest supported viewport;
breakpoints are progressive enhancements upward.

## Breakpoints

Semantic, not device names. Use the named breakpoint that matches the
*reason* for the change, not the device you tested on.

| Token | Min width | Intended use |
|-------|-----------|--------------|
| (default) | 0 | Phones, including small phones (~360px). |
| `sm` | 480px | Large phones / phablets. |
| `md` | 768px | Tablets, foldables. |
| `lg` | 1024px | Small laptops. |
| `xl` | 1280px | Standard desktop. |
| `2xl` | 1536px | Wide desktop / external monitor. |

Tailwind utilities use these directly: `md:grid-cols-2`, `lg:p-inset-xl`.

## Layout rules

- **Default everything for `<sm`.** Don't write `<sm:` overrides — write the
  mobile style without a prefix.
- **Use layout primitives** (`Stack`, `Cluster`, `Grid` when they land)
  instead of repeated media queries inside features.
- **Container widths are tokenized.** Pages use `max-w-container-lg` etc.;
  they never invent a width.
- **No horizontal scroll** except intentional carousels with snap and a
  scrollbar shadow indicating overflow.

## Type scale

- Body text is **16px minimum**. Never use the Tailwind default 14px for
  body copy on mobile.
- Headings are **fluid via `clamp()`** between `sm` and `lg`; locked above.
- Tabular numbers (`tabular-nums`) for any column of numbers — set counts,
  weights, durations, money.

## Density

- **Comfortable** (default): full token-spacing scale.
- **Compact**: one step down on vertical spacing, only on `lg+`. Activated
  per-screen via a layout prop, never globally.
- **Never compact on phones.** Touch targets stay at 44×44 regardless.

## Inputs and pointer

- **Touch is the assumed input below `lg`.** Hover-reveals and right-click
  affordances must have a touch-equivalent (long-press, kebab menu).
- **Hit areas** for icon-only controls are 44×44 on all touch viewports,
  even when the visual is smaller.
- **Don't disable zoom.** `viewport` allows user scaling; we set
  `maximum-scale=1` only on inputs where iOS zoom-on-focus is unwanted, and
  only by using 16px font-size to prevent the zoom rather than the attribute.

## Orientation

- **Workout & timer screens stay legible in landscape on phones.** Many
  users prop their phone sideways during cardio. Validate both orientations
  for any in-session UI.
- **No "rotate your device" walls.** Adapt instead.

## Safe areas

- Use `env(safe-area-inset-*)` on full-bleed surfaces (in-session UI, modals
  pinned to bottom).
- Bottom-pinned primary actions clear the home indicator on iOS.

## Testing

For any UI change, verify at minimum:
- **375 × 667** (iPhone SE) — the smallest first-class target.
- **768 × 1024** (iPad portrait).
- **1280 × 800** (small laptop).

Bonus when relevant:
- **320 × 568** if you suspect tight content. Don't ship broken at this
  size, but don't optimize for it.
- **Landscape on the smallest target** for in-session screens.

## When in doubt

Mobile wins the tie-break. If the desktop layout requires the mobile layout
to compromise, the desktop layout is wrong.
