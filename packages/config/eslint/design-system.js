/**
 * Design-system enforcement rules — applied to L2 patterns and L3 feature code.
 *
 * Intentionally NOT applied to L1 primitives (packages/ui/src/components/primitives),
 * which are the canonical place to anchor raw Tailwind utilities while we migrate to
 * semantic tokens. See docs/DESIGN_SYSTEM.md §3 and §7.
 *
 * Two layers of enforcement:
 *   1. Banned raw values inside string literals (hex colors, raw px).
 *   2. Banned inline-style attribute on JSX (forces token-driven Tailwind classes).
 *
 * Add jsx-a11y here once it's installed:
 *   extends: ["plugin:jsx-a11y/recommended"]
 */
module.exports = {
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        // Hex colors in string literals: #abc, #abcd, #aabbcc, #aabbccdd
        selector: "Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
        message:
          "Raw hex colors are not allowed outside L1 primitives. Use a semantic token (e.g. `bg-accent`, `text-text-muted`) or add one to tokens.json. See docs/DESIGN_SYSTEM.md §4.",
      },
      {
        // Raw pixel literals in string literals (e.g. style strings, className): "16px"
        selector: "Literal[value=/(?<![a-zA-Z0-9-])[0-9]+px\\b/]",
        message:
          "Raw pixel values are not allowed outside L1 primitives. Use a spacing token (`p-inset-md`, `gap-stack-sm`) or add one. See docs/DESIGN_SYSTEM.md §4.",
      },
      {
        // rgb()/rgba()/hsl()/hsla() literals
        selector: "Literal[value=/\\b(?:rgba?|hsla?)\\s*\\(/]",
        message:
          "Raw color functions (rgb/rgba/hsl/hsla) are not allowed outside L1 primitives. Use a semantic token. See docs/DESIGN_SYSTEM.md §4.",
      },
      {
        // Banned: <X style={{ ... }} /> — forces token-driven Tailwind classes.
        selector: "JSXAttribute[name.name='style']",
        message:
          "Inline `style` is not allowed outside L1 primitives. Use Tailwind utilities backed by semantic tokens. See docs/DESIGN_SYSTEM.md §7.",
      },
    ],
  },
};
