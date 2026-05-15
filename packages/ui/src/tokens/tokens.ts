/**
 * Generated from tokens.json. Do not edit by hand.
 *
 * Use the CSS custom properties (tokens.css) for styling. This module exists
 * for non-CSS contexts: chart libraries, canvas, server-rendered emails,
 * tests that need the raw value, etc.
 *
 * For Tailwind utilities, prefer the theme keys configured in
 * `packages/ui/tailwind.config.ts`.
 */

export const tokens = {
  color: {
    light: {
      surface: {
        default: "#FFFFFF",
        raised:  "#FFFFFF",
        sunken:  "#F8FAFC",
        overlay: "rgb(15 23 42 / 0.55)",
      },
      border:  { subtle: "#E2E8F0", default: "#CBD5E1", strong: "#64748B" },
      text:    {
        primary:   "#0F172A",
        secondary: "#334155",
        muted:     "#64748B",
        inverse:   "#FFFFFF",
        onAccent:  "#FFFFFF",
      },
      accent:  { default: "#2E5BFF", hover: "#1E40AF", subtle: "#EEF2FF" },
      signal:  { success: "#16A34A", danger: "#DC2626", warning: "#D97706", pr: "#F59E0B" },
      focusRing: "#2E5BFF",
    },
    dark: {
      surface: {
        default: "#0F172A",
        raised:  "#1E293B",
        sunken:  "#020617",
        overlay: "rgb(2 6 23 / 0.70)",
      },
      border:  { subtle: "#1E293B", default: "#334155", strong: "#64748B" },
      text:    {
        primary:   "#F8FAFC",
        secondary: "#E2E8F0",
        muted:     "#94A3B8",
        inverse:   "#0F172A",
        onAccent:  "#FFFFFF",
      },
      accent:  { default: "#6366F1", hover: "#818CF8", subtle: "#172554" },
      signal:  { success: "#16A34A", danger: "#DC2626", warning: "#D97706", pr: "#F59E0B" },
      focusRing: "#818CF8",
    },
  },
  space: {
    inset:  { xs: 8,  sm: 12, md: 16, lg: 24, xl: 32 },
    stack:  { xs: 8,  sm: 12, md: 16, lg: 24, xl: 40 },
    inline: { xs: 4,  sm: 8,  md: 12, lg: 16 },
  },
  radius:    { control: 8, card: 12, pill: 9999 },
  duration:  { instant: 0, fast: 120, base: 200, slow: 320 },
  easing:    {
    standard:   "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.3, 0, 0, 1.2)",
  },
  container: { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 },
  breakpoint: { sm: 480, md: 768, lg: 1024, xl: 1280, "2xl": 1536 },
} as const;

export type Tokens = typeof tokens;
export type ThemeName = keyof Tokens["color"];
