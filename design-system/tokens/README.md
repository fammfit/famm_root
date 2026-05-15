# Tokens

Documentation surface for the token catalog. The **code source of
truth** is
[`../../packages/ui/src/tokens/tokens.json`](../../packages/ui/src/tokens/tokens.json);
the generated CSS variables and TS exports live next to it. This folder
explains *what each token means* and *when to use it*.

## Starter token files

The per-category JSON files in this folder are the **readable contract**
for designers and AI tools. Each leaf carries `value`, `usage`, and
`notes`. The path through the tree is the semantic name
(`color.text.primary`, `space.inset.md`, `motion.signature.prCelebrate`).

| File | What it covers |
|------|----------------|
| `colors.json` | Surface, text, accent, signal, border, focus ring (light + dark). |
| `typography.json` | Font families, size scale, weights, line heights, letter spacing, features. |
| `spacing.json` | Three axes — `inset` (padding), `stack` (vertical gap), `inline` (horizontal gap). |
| `radius.json` | `control`, `card`, `pill` + `none`. |
| `shadows.json` | `sm`, `md`, `lg`, `focus`. |
| `motion.json` | Durations, easings, named signature motions. |
| `breakpoints.json` | Viewport breakpoints (`sm`–`2xl`) + container max-widths. |

These files document the system; they do not regenerate the code
package. If a value differs between a starter file and
`tokens.json`, the code file wins — fix the doc, then file a ticket.

## How tokens are organized

Three layers (see `docs/DESIGN_SYSTEM.md` §4):

1. **Primitive** — raw values (`brand.600 = #2E5BFF`). Never used directly
   by app code.
2. **Semantic** — intent (`accent.default`, `text.muted`, `signal.pr`).
   This is what app code references through Tailwind utilities.
3. **Component** — per-component overrides. Rare; require DS-owner sign-off.

## Color

### Surface
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `surface.default` | `#FFFFFF` | `#0F172A` | App background. |
| `surface.raised` | `#FFFFFF` | `#1E293B` | Cards, sheets, raised panels. |
| `surface.sunken` | `#F8FAFC` | `#020617` | Inset zones (sidebar, list striping). |
| `surface.overlay` | translucent slate | translucent slate | Modal/sheet scrim. |

### Text
| Token | Use |
|-------|-----|
| `text.primary` | Default body and headings. |
| `text.secondary` | Labels and de-emphasized headings. |
| `text.muted` | Hints, captions, timestamps. |
| `text.inverse` | Text on inverted surfaces. |
| `text.onAccent` | Text on accent-filled buttons/badges. |

### Accent
| Token | Use |
|-------|-----|
| `accent.default` | Primary actions, links, focus ring. |
| `accent.hover` | Hover state of `accent.default`. |
| `accent.subtle` | Accent-tinted backgrounds (selected row, badge bg). |

### Signal
| Token | Use |
|-------|-----|
| `signal.success` | Set complete, payment success. Never decorative. |
| `signal.danger` | Errors, destructive confirmations. |
| `signal.warning` | Soft warnings ("this will affect future bookings"). |
| `signal.pr` | **Personal record.** Reserved. Only on PR moments. |

### Border
| Token | Use |
|-------|-----|
| `border.subtle` | Card hairlines, divider lines. |
| `border.default` | Form controls, surface separation. |
| `border.strong` | High-emphasis dividers, focus on dense surfaces. |

## Space

Three intents — pick the one that matches the *direction* and *purpose*:

| Token group | Direction | Use |
|-------------|-----------|-----|
| `space.inset.*` | inward (padding) | Padding inside containers. |
| `space.stack.*` | vertical (gap) | Gap between stacked elements. |
| `space.inline.*` | horizontal (gap) | Gap between inline elements. |

Each comes in `xs / sm / md / lg / xl` where applicable.

## Radius

- `radius.control` (8px) — buttons, inputs, badges.
- `radius.card` (12px) — cards, sheets, panels.
- `radius.pill` (9999px) — pills, avatars, fully-rounded tags.

## Motion

- Durations: `duration.fast` (120ms) / `base` (200ms) / `slow` (320ms).
- Easing: `easing.standard` (decelerate) / `easing.emphasized` (subtle
  overshoot — signature moments only).
- See [`../motion.md`](../motion.md).

## Adding a token

1. Add it to `packages/ui/src/tokens/tokens.json` under the right layer.
2. Run `npm run tokens:generate` — this updates `tokens.css` and
   `tokens.ts`.
3. Surface it in `packages/ui/tailwind.config.ts` if it should be a
   utility.
4. Add a row to the relevant table in this README.
5. Add an entry to `../changelog.md`.

## Removing a token

1. Mark it deprecated in `tokens.json` with a comment pointing to the
   replacement. Don't remove yet.
2. Run codemod or grep to remove call sites.
3. After one minor release with no usage, delete the entry, regenerate,
   and bump the package's major version.
