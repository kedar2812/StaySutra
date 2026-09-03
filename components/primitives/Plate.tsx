import {
  plateFor,
  plateGeometry,
  PLATE_H,
  PLATE_W,
  type PlateScene,
  type PlateMood,
} from "@/lib/plate";

interface PlateProps {
  /** Stable seed — use the slug, so a property always renders the same plate. */
  seed: string;
  scene?: PlateScene;
  mood?: PlateMood;
  className?: string;
  /** Featured photography stays full-colour; secondary imagery is duotoned. */
  muted?: boolean;
  /**
   * Where to hold the crop when the frame is a different shape to the plate.
   * A tall frame keeps its ground — cropping to the middle of a 16:9 landscape
   * throws away the horizon and leaves a strip of empty sky.
   */
  anchor?: "center" | "bottom";
}

/**
 * A brand-native landscape used wherever real photography has not arrived yet.
 * Renders as inline SVG: no network request, no layout shift, no licensed stock.
 * See lib/plate.ts for the reasoning.
 */
export function Plate({
  seed,
  scene,
  mood,
  className,
  muted = false,
  anchor = "center",
}: PlateProps) {
  const picked = plateFor(seed);
  const s = scene ?? picked.scene;
  const m = mood ?? picked.mood;
  const g = plateGeometry(seed, s, m);
  const uid = `p${Math.abs(hashId(seed + s + m)).toString(36)}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
      preserveAspectRatio={anchor === "bottom" ? "xMidYMax slice" : "xMidYMid slice"}
      role="presentation"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g.palette.skyTop} />
          <stop offset="38%" stopColor={g.palette.skyMid} />
          <stop offset="72%" stopColor={g.palette.skyLow} stopOpacity="0.72" />
          <stop offset="100%" stopColor={g.palette.skyLow} />
        </linearGradient>

        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={g.palette.glow} stopOpacity="0.72" />
          <stop offset="38%" stopColor={g.palette.glow} stopOpacity="0.22" />
          <stop offset="100%" stopColor={g.palette.glow} stopOpacity="0" />
        </radialGradient>

        {/* One gradient per ridge: hazed at the crest, solid at the base. */}
        {g.ridges.map((r, i) => (
          <linearGradient key={i} id={`${uid}-r${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={r.top} />
            <stop offset="34%" stopColor={r.fill} />
            <stop offset="100%" stopColor={r.fill} />
          </linearGradient>
        ))}

        {/* Light pooling along the horizon, behind everything but the sky. */}
        <linearGradient id={`${uid}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g.palette.haze} stopOpacity="0" />
          <stop offset="72%" stopColor={g.palette.haze} stopOpacity="0.3" />
          <stop offset="100%" stopColor={g.palette.haze} stopOpacity="0.04" />
        </linearGradient>

        {/* Bottom scrim baked into the plate so type always has ground to sit on. */}
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070E1A" stopOpacity="0" />
          <stop offset="100%" stopColor="#070E1A" stopOpacity="0.78" />
        </linearGradient>

        {/* A soft vignette keeps the eye in the frame. */}
        <radialGradient id={`${uid}-vig`} cx="50%" cy="46%" r="72%">
          <stop offset="55%" stopColor="#070E1A" stopOpacity="0" />
          <stop offset="100%" stopColor="#070E1A" stopOpacity="0.45" />
        </radialGradient>
      </defs>

      <rect width={PLATE_W} height={PLATE_H} fill={`url(#${uid}-sky)`} />

      {/* Sun / moon, and the light it throws into the air around it */}
      <circle cx={g.discX} cy={g.discY} r={g.discR * 6} fill={`url(#${uid}-glow)`} />
      <circle
        cx={g.discX}
        cy={g.discY}
        r={g.discR}
        fill={g.palette.disc}
        opacity={g.palette.discOpacity}
      />

      <rect
        x="0"
        y={g.horizon - 230}
        width={PLATE_W}
        height={250}
        fill={`url(#${uid}-haze)`}
      />

      {g.ridges.map((r, i) => (
        <path key={i} d={r.d} fill={`url(#${uid}-r${i})`} opacity={r.opacity} />
      ))}

      {/* Reflected column on water */}
      {g.water && (
        <rect
          x={g.discX - g.discR * 0.45}
          y={g.horizon}
          width={g.discR * 0.9}
          height={PLATE_H - g.horizon}
          fill={g.palette.disc}
          opacity="0.13"
        />
      )}

      {g.foreground.map((f, i) => (
        <path
          key={i}
          d={f.d}
          fill={f.fill ?? "none"}
          stroke={f.stroke ?? "none"}
          strokeWidth={f.width}
          strokeLinecap="round"
          opacity={f.opacity ?? 1}
        />
      ))}

      <rect
        x="0"
        y={PLATE_H * 0.52}
        width={PLATE_W}
        height={PLATE_H * 0.48}
        fill={`url(#${uid}-floor)`}
      />
      <rect width={PLATE_W} height={PLATE_H} fill={`url(#${uid}-vig)`} />

      {/* Duotone pass — pulls secondary imagery onto one brand axis. DPR §4.6 */}
      {muted && <rect width={PLATE_W} height={PLATE_H} fill="#0A1628" opacity="0.4" />}
    </svg>
  );
}

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
