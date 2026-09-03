/**
 * Branded image plates.
 *
 * The client's photography does not exist yet (see docs/CONTENT-GAPS.md). Rather
 * than ship licensed stock that would have to be torn out — or a grey box — every
 * image slot renders a deterministic, brand-native SVG landscape: duotone navy
 * shadow, warm gold highlight, atmospheric ridge layers.
 *
 * It is honest (nothing pretends to be a photograph of a real property), it is
 * consistent (one visual language across mixed content), it costs no network
 * request, and the moment a real `Media` row exists the component prefers it.
 *
 * DPR §4.6 (duotone treatment, no generic stock), §4.7, §12 (missing image).
 */

export type PlateScene = "ghat" | "coast" | "forest" | "plateau" | "city" | "highway";
export type PlateMood = "dusk" | "night" | "dawn";

export const PLATE_W = 1600;
export const PLATE_H = 900;

/**
 * Every generated coordinate is rounded before it reaches the DOM. Math.sin and
 * Math.cos are allowed to differ in their last bits between the Node build and
 * the browser, and an unrounded path string turns that into a hydration mismatch.
 */
const n = (v: number): number => Math.round(v * 100) / 100;

/* — Seeded randomness ————————————————————————————————————————— */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SCENES: PlateScene[] = ["ghat", "coast", "forest", "plateau", "city", "highway"];
const MOODS: PlateMood[] = ["dusk", "night", "dawn"];

/** Picks a stable scene + mood for a slug so a property always looks the same. */
export function plateFor(seed: string): { scene: PlateScene; mood: PlateMood } {
  const r = rng(`scene:${seed}`);
  return {
    scene: SCENES[Math.floor(r() * SCENES.length)] as PlateScene,
    mood: MOODS[Math.floor(r() * MOODS.length)] as PlateMood,
  };
}

/* — Palettes ————————————————————————————————————————————————— */

interface Palette {
  skyTop: string;
  skyMid: string;
  skyLow: string;
  glow: string;
  disc: string;
  discOpacity: number;
  ridges: string[];
  haze: string;
}

const PALETTES: Record<PlateMood, Palette> = {
  dusk: {
    skyTop: "#08101F",
    skyMid: "#1B3A63",
    skyLow: "#D8973C",
    glow: "#F7D07A",
    disc: "#FFEFC4",
    discOpacity: 0.95,
    // Aerial perspective: far ridges sit close to the sky, near ones go to ink.
    ridges: ["#5A7699", "#3D5A80", "#26405F", "#142744", "#070E1A"],
    haze: "#F0BE63",
  },
  night: {
    skyTop: "#03070E",
    skyMid: "#0B1A2E",
    skyLow: "#274A73",
    glow: "#9DB8D6",
    disc: "#F2EAD3",
    discOpacity: 0.72,
    ridges: ["#3C5A7C", "#2A4463", "#1A2F4A", "#101F33", "#050B14"],
    haze: "#7FA0C4",
  },
  dawn: {
    skyTop: "#0A1526",
    skyMid: "#33547C",
    skyLow: "#EEB264",
    glow: "#FFDA96",
    disc: "#FFF7E0",
    discOpacity: 0.9,
    ridges: ["#6B85A6", "#48648A", "#2C4767", "#182D47", "#070E1A"],
    haze: "#F5C87E",
  },
};

/* — Colour helpers ————————————————————————————————————————————— */

function hex(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Linear blend between two hexes — used to build each ridge's haze gradient. */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const to = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[to(r1, r2), to(g1, g2), to(b1, b2)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/* — Ridge geometry ————————————————————————————————————————————— */

/** Smooth closed silhouette across the full width, built from summed sines. */
function ridge(
  seed: string,
  baseY: number,
  amplitude: number,
  roughness: number,
  points = 22,
): string {
  const r = rng(seed);
  const phases = [r() * 6.283, r() * 6.283, r() * 6.283];
  const freqs = [1 + r() * 1.2, 2.4 + r() * 1.8, 5 + r() * 3];
  const weights = [1, 0.42, 0.18];

  const ys: number[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    let v = 0;
    for (let k = 0; k < 3; k++) {
      v += Math.sin(t * Math.PI * 2 * (freqs[k] as number) + (phases[k] as number)) * (weights[k] as number);
    }
    // Sharpen a little so ridges read as rock rather than as a sine wave.
    const sharpened = Math.sign(v) * Math.pow(Math.abs(v) / 1.6, roughness) * 1.6;
    ys.push(n(baseY - sharpened * amplitude));
  }

  const step = PLATE_W / points;
  let d = `M -40 ${PLATE_H + 40} L -40 ${(ys[0] as number).toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const x0 = i * step;
    const x1 = (i + 1) * step;
    const y0 = ys[i] as number;
    const y1 = ys[i + 1] as number;
    const cx = (x0 + x1) / 2;
    d += ` C ${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  d += ` L ${PLATE_W + 40} ${PLATE_H + 40} Z`;
  return d;
}

/* — Scene foregrounds ————————————————————————————————————————— */

export interface PlateGeometry {
  palette: Palette;
  horizon: number;
  discX: number;
  discY: number;
  discR: number;
  /** `top` is the hazed colour at the ridge crest; `fill` is its base. */
  ridges: { d: string; fill: string; top: string; opacity: number }[];
  /** Scene-specific foreground paths, drawn in the deepest ink. */
  foreground: { d: string; fill?: string; stroke?: string; width?: number; opacity?: number }[];
  water: boolean;
}

export function plateGeometry(
  seed: string,
  scene: PlateScene,
  mood: PlateMood,
): PlateGeometry {
  const r = rng(`geo:${seed}`);
  const palette = PALETTES[mood];
  const horizon = n(scene === "coast" ? 560 : 520 + r() * 60);
  const discX = n(260 + r() * 1080);
  const discR = n(scene === "city" ? 54 : 78 + r() * 34);
  const discY = n(horizon - discR * (0.2 + r() * 1.1));

  const layers = 5;
  const ridges: { d: string; fill: string; opacity: number }[] = [];
  const foreground: PlateGeometry["foreground"] = [];

  if (scene === "coast") {
    // Water plane, then two headlands stepping in from the sides.
    ridges.push({
      d: `M -40 ${horizon} H ${PLATE_W + 40} V ${PLATE_H + 40} H -40 Z`,
      fill: palette.ridges[3] as string,
      opacity: 0.5,
    });
    for (let i = 1; i < 4; i++) {
      ridges.push({
        d: ridge(`${seed}-r${i}`, horizon - 26 + i * 14, 30 + i * 16, 1.15, 12),
        fill: palette.ridges[i + 1] as string,
        opacity: 1,
      });
    }
    // Palm silhouettes, low right.
    const px = n(PLATE_W - 200 - r() * 200);
    foreground.push({
      d: `M ${px} ${PLATE_H} C ${n(px - 8)} ${PLATE_H - 130} ${n(px + 4)} ${PLATE_H - 220} ${n(px + 18)} ${PLATE_H - 300}`,
      stroke: palette.ridges[4] as string,
      width: 11,
    });
    for (let f = 0; f < 6; f++) {
      const a = -2.5 + f * 0.62;
      foreground.push({
        d: `M ${n(px + 18)} ${PLATE_H - 300} q ${n(Math.cos(a) * 70)} ${n(Math.sin(a) * 62 - 26)} ${n(Math.cos(a) * 128)} ${n(Math.sin(a) * 96 - 10)}`,
        stroke: palette.ridges[4] as string,
        width: 8,
      });
    }
  } else if (scene === "city") {
    for (let i = 0; i < 3; i++) {
      ridges.push({
        d: ridge(`${seed}-r${i}`, horizon + i * 24, 22 + i * 10, 1.4, 10),
        fill: palette.ridges[i + 1] as string,
        opacity: 0.85,
      });
    }
    // A skyline of stepped blocks along the horizon.
    let x = -30;
    let d = `M -40 ${PLATE_H + 40} L -40 ${horizon + 60}`;
    while (x < PLATE_W + 40) {
      const w = 34 + r() * 92;
      const h = 60 + r() * 260;
      d += ` L ${x.toFixed(0)} ${(horizon + 60 - h).toFixed(0)} L ${(x + w).toFixed(0)} ${(horizon + 60 - h).toFixed(0)}`;
      x += w;
    }
    d += ` L ${PLATE_W + 40} ${PLATE_H + 40} Z`;
    foreground.push({ d, fill: palette.ridges[4] as string });
  } else if (scene === "highway") {
    for (let i = 0; i < layers; i++) {
      ridges.push({
        d: ridge(`${seed}-r${i}`, horizon - 60 + i * 46, 34 + i * 14, 1.25, 14),
        fill: palette.ridges[i] as string,
        opacity: 1,
      });
    }
    // Road running to a vanishing point on the horizon.
    const vx = n(PLATE_W / 2 + (r() - 0.5) * 260);
    foreground.push({
      d: `M ${n(vx - 16)} ${n(horizon + 70)} L ${n(vx + 16)} ${n(horizon + 70)} L ${PLATE_W * 0.92} ${PLATE_H + 40} L ${PLATE_W * 0.08} ${PLATE_H + 40} Z`,
      fill: palette.ridges[4] as string,
    });
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const y = n(horizon + 74 + Math.pow(t, 2.3) * (PLATE_H - horizon));
      const half = n(2 + Math.pow(t, 2.1) * 22);
      const len = n(8 + Math.pow(t, 2.1) * 74);
      foreground.push({
        d: `M ${n(vx - half * 0.14)} ${y} L ${n(vx + half * 0.14)} ${y} L ${n(vx + half * 0.2)} ${n(y + len)} L ${n(vx - half * 0.2)} ${n(y + len)} Z`,
        fill: palette.haze,
        opacity: n(0.34 - t * 0.12),
      });
    }
  } else if (scene === "forest") {
    for (let i = 0; i < layers; i++) {
      ridges.push({
        d: ridge(`${seed}-r${i}`, horizon - 90 + i * 56, 58 + i * 20, 1.5, 16),
        fill: palette.ridges[i] as string,
        opacity: 1,
      });
    }
    // A treeline of conifers along the lowest ridge.
    let d = `M -40 ${PLATE_H + 40} L -40 ${PLATE_H - 190}`;
    for (let x = -40; x < PLATE_W + 40; ) {
      const w = 26 + r() * 34;
      const h = 90 + r() * 180;
      const b = PLATE_H - 150 + r() * 40;
      d += ` L ${(x + w * 0.5).toFixed(0)} ${(b - h).toFixed(0)} L ${(x + w).toFixed(0)} ${b.toFixed(0)}`;
      x += w * 0.82;
    }
    d += ` L ${PLATE_W + 40} ${PLATE_H + 40} Z`;
    foreground.push({ d, fill: palette.ridges[4] as string });
  } else if (scene === "plateau") {
    for (let i = 0; i < layers; i++) {
      ridges.push({
        d: ridge(`${seed}-r${i}`, horizon - 50 + i * 48, 40 + i * 16, 1.3, 13),
        fill: palette.ridges[i] as string,
        opacity: 1,
      });
    }
    // Flat-topped fort massif — the Deccan silhouette.
    const cx = n(300 + r() * 900);
    const top = n(horizon - 210 - r() * 60);
    foreground.push({
      d: `M ${cx - 400} ${PLATE_H} L ${cx - 300} ${top + 120} L ${cx - 250} ${top + 26} L ${cx - 180} ${top} L ${cx + 170} ${top} L ${cx + 226} ${top + 20} L ${cx + 280} ${top + 116} L ${cx + 400} ${PLATE_H} Z`,
      fill: palette.ridges[4] as string,
    });
    foreground.push({
      d: `M ${cx - 60} ${top} v -46 h 22 v 20 h 20 v -20 h 22 v 46 Z`,
      fill: palette.ridges[4] as string,
    });
  } else {
    // ghat — switchback road cut into the hillside
    for (let i = 0; i < layers; i++) {
      ridges.push({
        d: ridge(`${seed}-r${i}`, horizon - 110 + i * 60, 66 + i * 22, 1.45, 15),
        fill: palette.ridges[i] as string,
        opacity: 1,
      });
    }
    const baseY = PLATE_H - 40;
    let d = `M ${PLATE_W * 0.02} ${baseY}`;
    let y = baseY;
    let x = PLATE_W * 0.02;
    for (let i = 0; i < 4; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const nx = n(dir === 1 ? PLATE_W * (0.76 - i * 0.09) : PLATE_W * (0.12 + i * 0.05));
      const ny = n(y - 120 + i * 12);
      d += ` C ${n(x + dir * 200)} ${n(y - 10)} ${n(nx - dir * 160)} ${n(ny + 46)} ${nx} ${ny}`;
      x = nx;
      y = ny;
    }
    // The road cut first, then the light catching its surface.
    // Cut into the hillside, then the light catching its wet surface.
    foreground.push({ d, stroke: palette.ridges[4] as string, width: 44, opacity: 0.85 });
    foreground.push({ d, stroke: mix(palette.ridges[3] as string, palette.haze, 0.22), width: 30, opacity: 0.9 });
    foreground.push({ d, stroke: palette.haze, width: 3, opacity: 0.55 });
  }

  /*
   * Aerial perspective. Each ridge fades toward the light at its crest and
   * settles into its own colour at the base — this, more than the silhouette
   * itself, is what stops the layers reading as flat blue blobs.
   */
  const hazed = ridges.map((rg, i) => ({
    ...rg,
    top: mix(rg.fill, palette.haze, Math.max(0.05, 0.32 - i * 0.07)),
  }));

  return {
    palette,
    horizon,
    discX,
    discY,
    discR,
    ridges: hazed,
    foreground,
    water: scene === "coast",
  };
}
