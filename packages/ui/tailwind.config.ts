import type { Config } from "tailwindcss";

/**
 * Tailwind theme is the consumption surface for design tokens.
 *
 * Color keys are semantic (surface, text, accent, signal). New raw values
 * are added to tokens.json first, surfaced as CSS variables in tokens.css,
 * then mapped here.
 *
 * See docs/DESIGN_SYSTEM.md §4.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--color-surface-default)",
          raised: "var(--color-surface-raised)",
          sunken: "var(--color-surface-sunken)",
          overlay: "var(--color-surface-overlay)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          DEFAULT: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)",
          onAccent: "var(--color-text-on-accent)",
        },
        accent: {
          DEFAULT: "var(--color-accent-default)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
        },
        signal: {
          success: "var(--color-signal-success)",
          danger: "var(--color-signal-danger)",
          warning: "var(--color-signal-warning)",
          pr: "var(--color-signal-pr)",
        },
      },
      spacing: {
        "inset-xs": "var(--space-inset-xs)",
        "inset-sm": "var(--space-inset-sm)",
        "inset-md": "var(--space-inset-md)",
        "inset-lg": "var(--space-inset-lg)",
        "inset-xl": "var(--space-inset-xl)",
        "stack-xs": "var(--space-stack-xs)",
        "stack-sm": "var(--space-stack-sm)",
        "stack-md": "var(--space-stack-md)",
        "stack-lg": "var(--space-stack-lg)",
        "stack-xl": "var(--space-stack-xl)",
        "inline-xs": "var(--space-inline-xs)",
        "inline-sm": "var(--space-inline-sm)",
        "inline-md": "var(--space-inline-md)",
        "inline-lg": "var(--space-inline-lg)",
      },
      borderRadius: {
        DEFAULT: "var(--radius-control, 0.5rem)",
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        focus: "var(--shadow-focus)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--easing-standard)",
        emphasized: "var(--easing-emphasized)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      screens: {
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      ringColor: {
        DEFAULT: "var(--color-focus-ring)",
      },
    },
  },
  plugins: [],
};

export default config;
