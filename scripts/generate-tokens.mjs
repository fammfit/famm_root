#!/usr/bin/env node
/**
 * Reads packages/ui/src/tokens/tokens.json and emits the consumable outputs:
 *
 *   - packages/ui/src/tokens/tokens.css   (CSS custom properties, light + dark)
 *   - packages/ui/src/tokens/tokens.ts    (typed const for non-CSS contexts)
 *
 * This is the bridge between Figma Variables (the eventual source of truth)
 * and the app. Today, tokens.json is hand-authored; once the Figma export
 * pipeline is wired up (see docs/DESIGN_SYSTEM.md §4.2), only the export
 * step changes — outputs stay the same.
 *
 * Usage:
 *   node scripts/generate-tokens.mjs           # write outputs
 *   node scripts/generate-tokens.mjs --check   # fail if outputs are stale (CI)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const TOKENS_DIR = resolve(REPO_ROOT, "packages/ui/src/tokens");
const INPUT = resolve(TOKENS_DIR, "tokens.json");
const OUT_CSS = resolve(TOKENS_DIR, "tokens.css");
const OUT_TS = resolve(TOKENS_DIR, "tokens.ts");

const CHECK = process.argv.includes("--check");

const tokens = JSON.parse(readFileSync(INPUT, "utf8"));

/** Resolve `{primitive.color.brand.600}` against the tokens tree. */
function resolveRef(value, tree) {
  if (typeof value !== "string") return value;
  const match = value.match(/^\{(.+)\}$/);
  if (!match) return value;
  const segments = match[1].split(".");
  let node = tree;
  for (const seg of segments) {
    if (node == null) return value;
    node = node[seg];
  }
  return typeof node === "string" ? resolveRef(node, tree) : value;
}

function flatten(obj, prefix = []) {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    if (v != null && typeof v === "object") {
      out.push(...flatten(v, [...prefix, k]));
    } else {
      out.push([[...prefix, k], v]);
    }
  }
  return out;
}

function kebab(parts) {
  return parts
    .map((p) => p.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase())
    .join("-");
}

const semColorPath = (parts) => `--color-${kebab(parts)}`;

/**
 * Walks the color tree for a theme and emits CSS variables grouped by
 * top-level category (surface, text, accent, signal, border). Inserts a
 * comment above each group naming the JSON path that backs it.
 *
 *   color.surface (light) — from design-system/tokens/colors.json
 *   --color-surface-default: #FFFFFF;
 *   --color-surface-raised:  #FFFFFF;
 *   ...
 */
function buildThemeBlock(themeColors, themeLabel) {
  const lines = [];
  let currentSection = null;
  for (const [path, value] of flatten(themeColors)) {
    // focusRing is surfaced separately by buildFocusRingBlock so the matching
    // --shadow-focus stays adjacent to its color.
    if (path[path.length - 1] === "focusRing") continue;
    const section = path[0];
    if (section !== currentSection) {
      if (currentSection !== null) lines.push("");
      lines.push(
        `  /* color.${section} (${themeLabel}) — design-system/tokens/colors.json */`,
      );
      currentSection = section;
    }
    const resolved = resolveRef(value, tokens);
    lines.push(`  ${semColorPath(path)}: ${resolved};`);
  }
  return lines.join("\n");
}

function buildRootBlock() {
  const sections = [];

  // Typography — design-system/tokens/typography.json (family only;
  // size/weight/line-height/letter-spacing are consumed via Tailwind
  // utilities backed by typography.json — see comments in tokens.css).
  const familyLines = ["  /* font.family — design-system/tokens/typography.json */"];
  for (const [k, v] of Object.entries(tokens.primitive.font.family)) {
    familyLines.push(`  --font-${k}: ${v};`);
  }
  sections.push(familyLines.join("\n"));

  // Spacing — design-system/tokens/spacing.json
  for (const group of ["inset", "stack", "inline"]) {
    const spaceLines = [
      `  /* space.${group} — design-system/tokens/spacing.json */`,
    ];
    for (const [k, v] of Object.entries(tokens.semantic.space[group])) {
      spaceLines.push(`  --space-${group}-${k}: ${resolveRef(v, tokens)};`);
    }
    sections.push(spaceLines.join("\n"));
  }

  // Radius — design-system/tokens/radius.json
  const radiusLines = ["  /* radius — design-system/tokens/radius.json */"];
  for (const [k, v] of Object.entries(tokens.semantic.radius)) {
    radiusLines.push(`  --radius-${k}: ${resolveRef(v, tokens)};`);
  }
  sections.push(radiusLines.join("\n"));

  // Shadow (non-focus; focus is theme-tinted, lives in the theme block).
  const shadowLines = ["  /* shadow — design-system/tokens/shadows.json */"];
  for (const [k, v] of Object.entries(tokens.primitive.shadow)) {
    if (k === "focus") continue;
    shadowLines.push(`  --shadow-${k}: ${v};`);
  }
  sections.push(shadowLines.join("\n"));

  // Motion — design-system/tokens/motion.json
  const durLines = [
    "  /* motion.duration — design-system/tokens/motion.json */",
  ];
  for (const [k, v] of Object.entries(tokens.primitive.motion.duration)) {
    durLines.push(`  --duration-${k}: ${v};`);
  }
  sections.push(durLines.join("\n"));

  const easingLines = [
    "  /* motion.easing — design-system/tokens/motion.json */",
  ];
  for (const [k, v] of Object.entries(tokens.primitive.motion.easing)) {
    easingLines.push(`  --easing-${k}: ${v};`);
  }
  sections.push(easingLines.join("\n"));

  // Container widths — design-system/tokens/breakpoints.json (container.*)
  const containerLines = [
    "  /* container — design-system/tokens/breakpoints.json (container.*) */",
  ];
  for (const [k, v] of Object.entries(tokens.semantic.container)) {
    containerLines.push(`  --container-${k}: ${v};`);
  }
  sections.push(containerLines.join("\n"));

  return sections.join("\n\n");
}

function buildFocusRingBlock(theme, themeLabel) {
  const ring = resolveRef(theme.color.focusRing, tokens);
  return [
    `  /* color.focus.ring + shadow.focus (${themeLabel}) — design-system/tokens/{colors,shadows}.json */`,
    `  --color-focus-ring: ${ring};`,
    `  --shadow-focus: 0 0 0 3px color-mix(in srgb, ${ring} 45%, transparent);`,
  ].join("\n");
}

const css = `/*
 * FAMM design tokens — CSS custom properties.
 *
 * Generated by scripts/generate-tokens.mjs. Do not hand-edit. Source:
 *   - packages/ui/src/tokens/tokens.json     (code source of truth)
 *   - design-system/tokens/*.json            (readable contract; per-token usage notes)
 *
 * Imported once at the app root via \`import "@famm/ui/tokens.css"\` in
 * apps/web/src/app/layout.tsx.
 *
 * THEMING
 *   Light is the default and lives at :root (also matched by
 *   [data-theme="light"]). Dark mode rides on <html data-theme="dark">.
 *   Future themes (high-contrast, studio-tenant) plug into the same
 *   [data-theme="..."] mechanism — that is the "room" reserved for them.
 *
 * NAMING CONVENTION
 *   JSON path (dot-separated)         CSS variable (kebab-cased)
 *   color.text.primary                --color-text-primary
 *   color.signal.pr                   --color-signal-pr
 *   color.focus.ring                  --color-focus-ring
 *   space.inset.md                    --space-inset-md
 *   space.stack.lg                    --space-stack-lg
 *   space.inline.sm                   --space-inline-sm
 *   radius.control                    --radius-control
 *   shadow.md                         --shadow-md
 *   motion.duration.fast              --duration-fast
 *   motion.easing.standard            --easing-standard
 *   container.lg                      --container-lg
 *
 * Typography size / weight / line-height / letter-spacing tokens are
 * documented in design-system/tokens/typography.json and surfaced through
 * Tailwind utilities (text-base, font-medium, leading-normal,
 * tracking-wide) — not as CSS custom properties — to avoid duplicating
 * Tailwind's existing scale.
 */

:root,
[data-theme="light"] {
${buildThemeBlock(tokens.semantic.light.color, "light")}

${buildFocusRingBlock(tokens.semantic.light, "light")}
}

/*
 * Dark theme. Values are wired now so the toggle can be enabled by flipping
 * <html data-theme="dark">; the toggle UX (system detection, persistence,
 * settings control) is the "later" part of dark-mode work.
 */
[data-theme="dark"] {
${buildThemeBlock(tokens.semantic.dark.color, "dark")}

${buildFocusRingBlock(tokens.semantic.dark, "dark")}
}

/*
 * Theme-agnostic tokens. Spacing, radius, shadow (non-focus), motion,
 * typography family, and container widths do not change between themes.
 */
:root {
${buildRootBlock()}
}

/*
 * Reduced-motion override. Token durations collapse to 0ms for users with
 * prefers-reduced-motion: reduce — any transition driven purely by
 * --duration-* gets a reduced variant for free. Translation- or
 * keyframe-based animations must still branch on useReducedMotion() —
 * see design-system/motion.md.
 */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-base: 0ms;
    --duration-slow: 0ms;
  }
}
`;

function resolveDeep(node) {
  if (typeof node === "string") return resolveRef(node, tokens);
  if (node == null || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = resolveDeep(v);
  return out;
}

const ts = `/**
 * Generated by scripts/generate-tokens.mjs. Do not edit by hand.
 * Source: packages/ui/src/tokens/tokens.json
 *
 * Use the CSS custom properties (tokens.css) for styling. This module exists
 * for non-CSS contexts: chart libraries, canvas, server-rendered emails,
 * tests that need the raw value, etc.
 */

export const tokens = ${JSON.stringify(
  {
    color: {
      light: resolveDeep(tokens.semantic.light.color),
      dark: resolveDeep(tokens.semantic.dark.color),
    },
    space: resolveDeep(tokens.semantic.space),
    radius: resolveDeep(tokens.semantic.radius),
    duration: tokens.primitive.motion.duration,
    easing: tokens.primitive.motion.easing,
    container: tokens.semantic.container,
  },
  null,
  2,
)} as const;

export type Tokens = typeof tokens;
export type ThemeName = keyof Tokens["color"];
`;

function readOrEmpty(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

if (CHECK) {
  const stale =
    readOrEmpty(OUT_CSS) !== css || readOrEmpty(OUT_TS) !== ts;
  if (stale) {
    console.error(
      "Tokens outputs are stale. Run `node scripts/generate-tokens.mjs` and commit the diff.",
    );
    process.exit(1);
  }
  console.log("Tokens outputs are up to date.");
} else {
  writeFileSync(OUT_CSS, css);
  writeFileSync(OUT_TS, ts);
  console.log("Wrote", OUT_CSS, "and", OUT_TS);
}
