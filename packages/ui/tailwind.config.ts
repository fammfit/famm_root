import type { Config } from "tailwindcss";

/**
 * FAMM Tailwind preset — design-token consumption surface.
 *
 * Every key here either:
 *   1. Maps a token from design-system/tokens/*.json to a Tailwind utility
 *      via the corresponding CSS variable in packages/ui/src/tokens/tokens.css.
 *   2. Configures a Tailwind concern that is itself part of the system
 *      (darkMode strategy, screens, content paths).
 *
 * Mapping reference — JSON path  →  Tailwind utility  →  CSS variable:
 *
 *   colors.json:
 *     color.surface.default      bg-surface              --color-surface-default
 *     color.surface.raised       bg-surface-raised       --color-surface-raised
 *     color.surface.sunken       bg-surface-sunken       --color-surface-sunken
 *     color.surface.overlay      bg-surface-overlay      --color-surface-overlay
 *     color.text.primary         text-text-primary       --color-text-primary
 *     color.text.secondary       text-text-secondary     --color-text-secondary
 *     color.text.muted           text-text-muted         --color-text-muted
 *     color.text.inverse         text-text-inverse       --color-text-inverse
 *     color.text.onAccent        text-text-onAccent      --color-text-on-accent
 *     color.accent.default       bg-accent / text-accent --color-accent-default
 *     color.accent.hover         hover:bg-accent-hover   --color-accent-hover
 *     color.accent.subtle        bg-accent-subtle        --color-accent-subtle
 *     color.signal.success       bg-signal-success       --color-signal-success
 *     color.signal.danger        bg-signal-danger        --color-signal-danger
 *     color.signal.warning       bg-signal-warning       --color-signal-warning
 *     color.signal.pr            text-signal-pr          --color-signal-pr
 *     color.border.subtle        border-border-subtle    --color-border-subtle
 *     color.border.default       border-border           --color-border-default
 *     color.border.strong        border-border-strong    --color-border-strong
 *     color.focus.ring           ring                    --color-focus-ring
 *
 *   spacing.json:
 *     space.inset.{xs..xl}       p-inset-{xs..xl}        --space-inset-*
 *     space.stack.{xs..xl}       gap-stack-{xs..xl}      --space-stack-*
 *     space.inline.{xs..lg}      gap-inline-{xs..lg}     --space-inline-*
 *
 *   radius.json:
 *     radius.control             rounded-control         --radius-control
 *     radius.card                rounded-card            --radius-card
 *     radius.pill                rounded-pill            --radius-pill
 *     (radius.none — use Tailwind's built-in rounded-none; no override needed)
 *
 *   shadows.json:
 *     shadow.sm                  shadow-sm               --shadow-sm
 *     shadow.md                  shadow / shadow-md      --shadow-md
 *     shadow.lg                  shadow-lg               --shadow-lg
 *     shadow.focus               shadow-focus            --shadow-focus
 *
 *   motion.json:
 *     motion.duration.fast       duration-fast           --duration-fast
 *     motion.duration.base       duration-base           --duration-base
 *     motion.duration.slow       duration-slow           --duration-slow
 *     motion.easing.standard     ease-standard           --easing-standard
 *     motion.easing.emphasized   ease-emphasized         --easing-emphasized
 *     motion.easing.linear       ease-linear             (also Tailwind default)
 *     (motion.signature.*        — reference by name in code, not as utility)
 *
 *   typography.json:
 *     font.family.sans           font-sans               --font-sans
 *     font.family.mono           font-mono               --font-mono
 *     (font.size.* / font.weight.* / font.lineHeight.* / font.letterSpacing.*
 *      use Tailwind's built-in scales — text-base, font-medium,
 *      leading-normal, tracking-wide — to avoid duplicating Tailwind's
 *      defaults. The typography.json file documents which Tailwind class
 *      corresponds to each semantic name.)
 *
 *   breakpoints.json:
 *     breakpoint.{sm..2xl}       sm: / md: / lg: / xl: / 2xl: prefixes
 *                                (literal px values — CSS spec doesn't yet
 *                                allow var() in @media queries.)
 *     container.{sm..2xl}        max-w-container-{sm..2xl}  --container-*
 *
 * What this config does NOT do:
 *   - It does not remove Tailwind's default palette (gray, red, blue, …).
 *     The default palette stays available so existing utilities don't
 *     suddenly fail at build time. New code uses semantic tokens; lint
 *     (packages/config/eslint/design-system.js) flags raw hex/px/rgb.
 *   - It does not override Tailwind's default font-size / font-weight /
 *     line-height / letter-spacing scales. typography.json names map onto
 *     Tailwind's existing scale (text-base, font-medium, leading-normal,
 *     tracking-wide) — see the file for the table.
 *   - It does not remove Tailwind's default boxShadow.xl / 2xl / inner.
 *     They remain in the prebuilt CSS but are not part of the design
 *     system — use shadow-sm / shadow / shadow-md / shadow-lg / shadow-focus.
 *
 * See also:
 *   - design-system/tokens/README.md       — token catalog index
 *   - design-system/tokens/*.json          — readable token contract
 *   - packages/ui/src/tokens/tokens.json   — code source of truth
 *   - packages/ui/src/tokens/tokens.css    — generated CSS variables
 *   - docs/DESIGN_SYSTEM.md §4             — token strategy
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],

  // Dark mode rides on <html data-theme="dark"> rather than a class so the
  // same attribute can carry future themes (high-contrast, studio-tenant).
  // See packages/ui/src/tokens/tokens.css.
  darkMode: ["class", '[data-theme="dark"]'],

  theme: {
    extend: {
      // ─── Colors — colors.json ─────────────────────────────────────────
      colors: {
        // color.surface.* — page and elevated surfaces.
        surface: {
          DEFAULT: "var(--color-surface-default)",
          raised: "var(--color-surface-raised)",
          sunken: "var(--color-surface-sunken)",
          overlay: "var(--color-surface-overlay)",
        },
        // color.border.* — hairlines, form borders, dividers.
        border: {
          subtle: "var(--color-border-subtle)",
          DEFAULT: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
        },
        // color.text.* — text colors. The `text` key here lets Tailwind
        // resolve utilities like `text-text-primary` cleanly.
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)",
          onAccent: "var(--color-text-on-accent)",
        },
        // color.accent.* — primary action color, links, focus.
        accent: {
          DEFAULT: "var(--color-accent-default)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
        },
        // color.signal.* — success / danger / warning / pr.
        // `signal.pr` is reserved for personal-record moments — see
        // design-system/tokens/colors.json and principles.md #9.
        signal: {
          success: "var(--color-signal-success)",
          danger: "var(--color-signal-danger)",
          warning: "var(--color-signal-warning)",
          pr: "var(--color-signal-pr)",
        },
      },

      // ─── Spacing — spacing.json ───────────────────────────────────────
      // Three intent-named groups (inset / stack / inline). These extend
      // Tailwind's default numeric scale; e.g. `p-4` still works (1rem
      // default) but new code uses `p-inset-md` (16px from token).
      spacing: {
        // space.inset.* — padding inward.
        "inset-xs": "var(--space-inset-xs)",
        "inset-sm": "var(--space-inset-sm)",
        "inset-md": "var(--space-inset-md)",
        "inset-lg": "var(--space-inset-lg)",
        "inset-xl": "var(--space-inset-xl)",
        // space.stack.* — vertical gap.
        "stack-xs": "var(--space-stack-xs)",
        "stack-sm": "var(--space-stack-sm)",
        "stack-md": "var(--space-stack-md)",
        "stack-lg": "var(--space-stack-lg)",
        "stack-xl": "var(--space-stack-xl)",
        // space.inline.* — horizontal gap.
        "inline-xs": "var(--space-inline-xs)",
        "inline-sm": "var(--space-inline-sm)",
        "inline-md": "var(--space-inline-md)",
        "inline-lg": "var(--space-inline-lg)",
      },

      // ─── Radius — radius.json ─────────────────────────────────────────
      // DEFAULT keeps `rounded` (the unsuffixed Tailwind utility) wired to
      // radius.control so legacy class strings don't break. radius.none
      // is not overridden — Tailwind's built-in `rounded-none` is fine.
      borderRadius: {
        DEFAULT: "var(--radius-control, 0.5rem)",
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },

      // ─── Shadows — shadows.json ───────────────────────────────────────
      // sm / md / lg map straight to the design tokens. DEFAULT (the
      // unsuffixed `shadow` utility) aliases to shadow.md so both
      // `className="shadow"` and `className="shadow-md"` resolve to the
      // same token value. focus is for surfaces where the `ring` utility
      // would clip.
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        focus: "var(--shadow-focus)",
      },

      // ─── Motion — motion.json ─────────────────────────────────────────
      // Token durations collapse to 0ms in prefers-reduced-motion via the
      // @media block in tokens.css — so transitions that use these tokens
      // get reduced motion for free.
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--easing-standard)",
        emphasized: "var(--easing-emphasized)",
        // motion.easing.linear is the same as Tailwind's built-in
        // ease-linear; we don't redefine it but list it here for parity
        // with the JSON token catalog.
      },

      // ─── Typography family — typography.json ──────────────────────────
      // Size / weight / line-height / letter-spacing intentionally use
      // Tailwind's built-in scales — see typography.json for the table
      // mapping semantic names to Tailwind classes.
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },

      // ─── Breakpoints — breakpoints.json ───────────────────────────────
      // Values are literal px because CSS @media queries cannot reference
      // var() in current browser engines. If/when @media-var lands, these
      // can shift to `var(--breakpoint-*)` and be sourced from tokens.css.
      // Keep these in sync with breakpoints.json.
      screens: {
        sm: "480px", // breakpoint.sm  — large phones
        md: "768px", // breakpoint.md  — tablets, foldables
        lg: "1024px", // breakpoint.lg — small laptops; pointer assumed at lg+
        xl: "1280px", // breakpoint.xl — standard desktop
        "2xl": "1536px", // breakpoint.2xl — wide desktop
      },

      // ─── Container max-widths — breakpoints.json (container.*) ────────
      // Distinct from `screens` above. These are MAX content widths used
      // on page-level surfaces, e.g. `<main class="max-w-container-lg">`.
      maxWidth: {
        "container-sm": "var(--container-sm)", // 640px  — reading surfaces
        "container-md": "var(--container-md)", // 768px  — narrow product
        "container-lg": "var(--container-lg)", // 1024px — default product
        "container-xl": "var(--container-xl)", // 1280px — wide product
        "container-2xl": "var(--container-2xl)", // 1536px — marketing
      },

      // ─── Focus ring color — colors.json (color.focus.ring) ────────────
      // Wires `ring`, `ring-2`, etc. to the focus-ring token so every
      // interactive element gets the same focus indicator without each
      // component picking a ring color manually.
      ringColor: {
        DEFAULT: "var(--color-focus-ring)",
      },
    },
  },

  plugins: [],
};

export default config;
