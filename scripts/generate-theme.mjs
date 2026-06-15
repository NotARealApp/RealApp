// Generates src/app/globals.css M3 color tokens from a single seed color using
// Google's material-color-utilities (TonalSpot scheme, the Android default).
// Run: npm run theme
//
// Only the color role values are generated. Status colors (good/warn/bad) and
// the Time-to-Go inner-panel overlays are app-specific and kept by hand below.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  Hct,
  SchemeTonalSpot,
  MaterialDynamicColors as M,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";

const SEED = "#65558f";

// M3 role -> our CSS var name. One source of truth for both schemes.
const ROLES = {
  surface: M.surface,
  "on-surface": M.onSurface,
  "on-surface-variant": M.onSurfaceVariant,
  "surface-container": M.surfaceContainer,
  "surface-container-high": M.surfaceContainerHigh,
  "surface-container-highest": M.surfaceContainerHighest,
  primary: M.primary,
  "on-primary": M.onPrimary,
  "primary-container": M.primaryContainer,
  "on-primary-container": M.onPrimaryContainer,
  "secondary-container": M.secondaryContainer,
  "on-secondary-container": M.onSecondaryContainer,
  outline: M.outline,
  "outline-variant": M.outlineVariant,
};

// App-specific, not part of the M3 color spec — kept by hand.
const STATUS = {
  dark: { "status-good": "#8bd99f", "status-warn": "#ffb454", "status-bad": "#ffb4ab" },
  light: { "status-good": "#1e6b3a", "status-warn": "#8a5d00", "status-bad": "#ba1a1a" },
};
const LEAVE = {
  dark: {
    "leave-col-bg": "rgba(0, 0, 0, 0.18)",
    "leave-btn-bg": "rgba(0, 0, 0, 0.18)",
    "leave-btn-bg-hover": "rgba(0, 0, 0, 0.28)",
  },
  light: {
    "leave-col-bg": "rgba(255, 255, 255, 0.6)",
    "leave-btn-bg": "rgba(255, 255, 255, 0.55)",
    "leave-btn-bg-hover": "rgba(255, 255, 255, 0.8)",
  },
};

function rolesFor(isDark) {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(SEED)), isDark, 0);
  const out = {};
  for (const [name, dc] of Object.entries(ROLES)) out[name] = hexFromArgb(dc.getArgb(scheme));
  return out;
}

// M3 role + status vars use the --app- prefix (mapped in @theme); the
// Time-to-Go overlay vars are referenced directly, so stay unprefixed.
function block(vars, prefix = "app-", indent = "  ") {
  return Object.entries(vars)
    .map(([k, v]) => `${indent}--${prefix}${k}: ${v};`)
    .join("\n");
}

const dark = rolesFor(true);
const light = rolesFor(false);

const css = `@import "tailwindcss";

/* M3 semantic tokens — generated from seed ${SEED} via material-color-utilities.
   Do not edit by hand; run \`npm run theme\` to regenerate. Dark is default,
   light via [data-theme="light"]. */
:root {
  color-scheme: dark;

${block(dark)}
${block(STATUS.dark)}

  /* Inner panels/buttons on the Time-to-Go hero card (over primary-container) */
${block(LEAVE.dark, "")}
}

:root[data-theme="light"] {
  color-scheme: light;

${block(light)}
${block(STATUS.light)}

${block(LEAVE.light, "")}
}

@theme inline {
  --font-sans: var(--font-roboto), "Noto Sans Malayalam", "Vazirmatn", ui-sans-serif, system-ui, sans-serif;

  --color-surface: var(--app-surface);
  --color-on-surface: var(--app-on-surface);
  --color-on-surface-variant: var(--app-on-surface-variant);
  --color-surface-container: var(--app-surface-container);
  --color-surface-high: var(--app-surface-container-high);
  --color-surface-highest: var(--app-surface-container-highest);
  --color-primary: var(--app-primary);
  --color-on-primary: var(--app-on-primary);
  --color-primary-container: var(--app-primary-container);
  --color-on-primary-container: var(--app-on-primary-container);
  --color-secondary-container: var(--app-secondary-container);
  --color-on-secondary-container: var(--app-on-secondary-container);
  --color-outline: var(--app-outline);
  --color-status-good: var(--app-status-good);
  --color-status-warn: var(--app-status-warn);
  --color-status-bad: var(--app-status-bad);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 28px;
  --radius-full: 999px;

  --shadow-elev-1: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
  --shadow-elev-2: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);

  --animate-shimmer: shimmer 1.2s infinite linear;
}

@keyframes shimmer {
  0% { background-position: -240px 0; }
  100% { background-position: 240px 0; }
}

@layer base {
  * {
    @apply box-border;
  }

  body {
    @apply m-0 min-h-dvh bg-surface font-sans text-on-surface antialiased;
  }

  :where(button, a, input, select, [tabindex]):focus-visible {
    @apply outline-2 outline-offset-2 outline-primary;
  }

  [dir="rtl"] body {
    @apply text-right;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../src/app/globals.css");
writeFileSync(target, css);
console.log(`Wrote ${target} from seed ${SEED}`);
