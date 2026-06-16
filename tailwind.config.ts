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
        // Floodlit-night football palette
        pitch: "#0a0f0a", // dark pitch background
        panel: "#111a12", // raised panels / cards
        lime: "#b6ff3c", // single electric-lime accent
      },
      fontFamily: {
        // Condensed display for scoreboard feel; mono for scores/numbers
        display: ["var(--font-display)", "Oswald", "Impact", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
