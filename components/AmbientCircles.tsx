import { useMemo } from "react";
import { View } from "react-native";

export type AmbientCirclesPreset = "header" | "auth" | "cta";

type CircleSpec = {
  key: string;
  leftPct: number;
  topPct: number;
  size: number;
  backgroundColor: string;
};

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const HEADER_COLORS = ["rgba(58, 74, 0, 0.06)", "rgba(82, 105, 0, 0.07)"];

const CTA_COLORS = ["rgba(58, 74, 0, 0.07)", "rgba(58, 74, 0, 0.05)"];

const AUTH_COLORS = ["rgba(202, 253, 0, 0.1)", "rgba(78, 99, 0, 0.06)", "rgba(236, 232, 86, 0.08)"];

function pickColor(rnd: () => number, palette: string[]) {
  return palette[Math.floor(rnd() * palette.length) % palette.length];
}

function generateCircles(preset: AmbientCirclesPreset, instanceId: number): CircleSpec[] {
  const seed = hashString(`${preset}:${instanceId}`);
  const rnd = createRng(seed);

  const count = preset === "auth" ? 3 : preset === "header" ? 2 : 2;

  const palette = preset === "auth" ? AUTH_COLORS : preset === "header" ? HEADER_COLORS : CTA_COLORS;

  const circles: CircleSpec[] = [];

  for (let i = 0; i < count; i++) {
    /** Köşelere yakın, ortayı kalabalıklaştırmadan */
    const corner = (i + instanceId) % 4;
    const cornerBias = [
      { lx: -15, ly: -10, rx: 35, ry: 45 },
      { lx: 55, ly: -15, rx: 40, ry: 40 },
      { lx: -20, ly: 45, rx: 45, ry: 35 },
      { lx: 50, ly: 50, rx: 40, ry: 30 },
    ][corner];
    const leftPct = cornerBias.lx + rnd() * cornerBias.rx;
    const topPct = cornerBias.ly + rnd() * cornerBias.ry;

    let size: number;
    if (preset === "auth") {
      size = Math.round(120 + rnd() * 100);
    } else if (preset === "header") {
      size = Math.round(72 + rnd() * 56);
    } else {
      size = Math.round(40 + rnd() * 36);
    }

    circles.push({
      key: `${preset}-${instanceId}-${i}`,
      leftPct,
      topPct,
      size,
      backgroundColor: pickColor(rnd, palette),
    });
  }

  return circles;
}

type AmbientCirclesProps = {
  preset: AmbientCirclesPreset;
  /** Aynı preset’i birden fazla yerde kullanırken farklı dağılım için (ör. iki CTA). */
  instanceId?: number;
};

/**
 * Tek kaynaklı dekoratif daireler — seed’li sözde rastgele; yeniden çizimde konumları sabit kalır.
 */
export default function AmbientCircles({ preset, instanceId = 0 }: AmbientCirclesProps) {
  const circles = useMemo(() => generateCircles(preset, instanceId), [preset, instanceId]);

  return (
    <View className="pointer-events-none absolute inset-0 overflow-hidden" collapsable={false}>
      {circles.map((c) => (
        <View
          key={c.key}
          style={{
            position: "absolute",
            left: `${c.leftPct}%`,
            top: `${c.topPct}%`,
            width: c.size,
            height: c.size,
            borderRadius: c.size / 2,
            backgroundColor: c.backgroundColor,
          }}
        />
      ))}
    </View>
  );
}
