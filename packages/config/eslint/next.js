/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./base.js",
    "next/core-web-vitals",
  ],
  rules: {
    "import/no-default-export": "off",
    "@next/next/no-html-link-for-pages": "off",
  },
};
