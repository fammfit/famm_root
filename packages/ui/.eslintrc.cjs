/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  overrides: [
    {
      // L2 patterns must obey the no-raw-values rules.
      files: ["src/components/patterns/**/*.{ts,tsx}"],
      extends: ["@famm/config/eslint/design-system"],
    },
    // L1 primitives are intentionally exempt — they anchor raw utilities
    // during the migration to fully semantic tokens.
  ],
};
