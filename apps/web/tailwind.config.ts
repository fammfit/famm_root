import type { Config } from "tailwindcss";

import uiPreset from "@famm/ui/tailwind.config";

/**
 * The web app inherits the design-system theme from @famm/ui as a Tailwind
 * preset, so semantic tokens (surface, text, accent, signal, inset-*,
 * stack-*, etc.) are directly usable. Web-specific extensions go here —
 * new color values belong in tokens.json, not this file.
 */
const config: Config = {
  presets: [uiPreset],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
