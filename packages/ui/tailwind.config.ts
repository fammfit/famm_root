import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--color-brand-50, #eff6ff)",
          100: "var(--color-brand-100, #dbeafe)",
          200: "var(--color-brand-200, #bfdbfe)",
          500: "var(--color-brand-500, #3b82f6)",
          600: "var(--color-brand-600, #2563eb)",
          700: "var(--color-brand-700, #1d4ed8)",
          900: "var(--color-brand-900, #1e3a8a)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius, 0.5rem)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
