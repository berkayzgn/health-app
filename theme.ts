export type Theme = "light" | "dark";

export const colors = {
  light: {
    background: "#f6f8f7",
    surface: "#ffffff",
    surfaceAlt: "#f9fafb",
    text: "#111827",
    textSecondary: "#4b5563",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    borderLight: "#f3f4f6",
    accent: "#10b77f",
    accentMuted: "rgba(16, 183, 127, 0.1)",
    danger: "#ef4444",
    iconMuted: "#6b7280",
    iconSecondary: "#9ca3af",
    placeholder: "#9ca3af",
    progressBg: "#e2e8f0",
    sectionTitle: "#6b7280",
  },
  dark: {
    background: "#0f1419",
    surface: "#1f2937",
    surfaceAlt: "#374151",
    text: "#f9fafb",
    textSecondary: "#d1d5db",
    textMuted: "#9ca3af",
    border: "#374151",
    borderLight: "#4b5563",
    accent: "#10b77f",
    accentMuted: "rgba(16, 183, 127, 0.25)",
    danger: "#ef4444",
    iconMuted: "#9ca3af",
    iconSecondary: "#6b7280",
    placeholder: "#6b7280",
    progressBg: "#374151",
    sectionTitle: "#9ca3af",
  },
} as const;

export const getThemeColors = (theme: Theme) => colors[theme];
