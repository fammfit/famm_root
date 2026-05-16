/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  extends: [
    // Design-system rules (no raw hex/px/inline-style outside L1 primitives).
    // See docs/DESIGN_SYSTEM.md §7.
    require.resolve("@famm/config/eslint/design-system"),
  ],
};
