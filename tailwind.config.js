/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#10b77f",
        "primary/10": "rgba(16, 183, 127, 0.1)",
        "primary/20": "rgba(16, 183, 127, 0.2)",
      },
    },
  },
  plugins: [],
};
