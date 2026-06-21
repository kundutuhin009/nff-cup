import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Floodlit pitch at night" palette. Single source of truth — components
        // reference these semantic tokens, never raw hex.
        "turf-deep": "#0c1f14", // deep turf — main background
        "turf-panel": "#11281a", // raised panels / cards
        "turf-line": "#2a4a36", // borders / dividers — faint pitch lines
        chalk: "#f4f7f2", // primary text — "chalk white"
        "chalk-mut": "#9db3a6", // muted text / labels / captions
        accent: "#f5a623", // matchday amber — floodlights & trophy (emphasis only)
        "accent-soft": "rgba(245,166,35,0.13)", // translucent amber for glows / hover washes
      },
      fontFamily: {
        // Condensed broadcast display; tabular mono for scores/numbers; clean body.
        display: ["var(--font-display)", "Oswald", "Impact", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
