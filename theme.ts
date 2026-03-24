export type Theme = "light" | "dark";

export const colors = {
  light: {
    background: "#f6f6f6",
    surface: "#ffffff",
    text: "#111827",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    accent: "#4e6300",
  },
  dark: {
    background: "#0e0f0a",
    surface: "#13140e",
    text: "#efe9d8",
    textMuted: "#9d9888",
    border: "#464540",
    accent: "#ccff00",
  },
} as const;

export const getThemeColors = (theme: Theme) => colors[theme];
