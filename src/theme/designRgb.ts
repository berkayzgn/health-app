import palettes from "./palettes.json";

export const LIGHT_RGB = palettes.light as Record<string, string>;
export const DARK_RGB = palettes.dark as Record<string, string>;

export const THEME_COLOR_KEYS = Object.keys(palettes.light) as (keyof typeof palettes.light)[];

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

export function rgbTripletToHex(rgb: string): string {
  const parts = rgb.split(/\s+/).map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "#000000";
  return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function rgbTripletToRgba(rgb: string, alpha: number): string {
  const parts = rgb.split(/\s+/).map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}
