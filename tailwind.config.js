/** @type {import('tailwindcss').Config} */
const palettes = require("./src/theme/palettes.json");

const THEME_COLOR_KEYS = Object.keys(palettes.light);

const semanticColors = Object.fromEntries(
  THEME_COLOR_KEYS.map((key) => [key, `rgb(var(--color-${key}) / <alpha-value>)`]),
);

module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: semanticColors,
      fontFamily: {
        headline: ["Manrope_800ExtraBold"],
        body: ["Inter_400Regular"],
        label: ["Inter_600SemiBold"],
      },
      borderRadius: {
        card: "1.5rem",
        float: "3rem",
        pill: "9999px",
      },
      boxShadow: {
        /** Light: soft neutral lift (no harsh lines). */
        ambient: "0 20px 40px -10px rgba(45, 47, 47, 0.08)",
        /** Dark: bioluminescent primary glow + depth (6% lime wash). */
        "ambient-glow":
          "0 40px 60px -10px rgba(204, 255, 0, 0.06), 0 24px 48px -12px rgba(0, 0, 0, 0.55)",
      },
    },
  },
  plugins: [],
};
