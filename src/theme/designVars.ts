import { vars } from "nativewind";
import type { Theme } from "../theme";
import { DARK_RGB, LIGHT_RGB } from "./designRgb";

const KEYS = Object.keys(LIGHT_RGB);

/** NativeWind CSS variables for semantic colors (light / dark). */
export function getDesignVars(mode: Theme) {
  const palette = mode === "dark" ? DARK_RGB : LIGHT_RGB;
  const flat: Record<string, string> = {};
  for (const key of KEYS) {
    flat[`--color-${key}`] = palette[key]!;
  }
  return vars(flat);
}
