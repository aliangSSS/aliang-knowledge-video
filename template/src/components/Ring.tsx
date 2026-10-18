import { easeOutQuint, lerp } from "../lib/anim";
import { C, H, W } from "../lib/theme";

/** A ring of light expanding outwards from an impact point (formula reveal, title hit). */
export const Ring: React.FC<{ f: number; at: number; x?: number; y?: number; dur?: number; r0?: number; r1?: number; color?: string }> = ({
  f, at, x = W / 2, y = H * 0.4, dur = 36, r0 = 20, r1 = 700, color = C.gold,
}) => {
  const k = (f - at) / dur;
  if (k < 0 || k > 1) return null;
  const r = lerp(r0, r1, easeOutQuint(k));
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={3 * (1 - k) + 0.6} opacity={Math.pow(1 - k, 1.4)}
        style={{ filter: `drop-shadow(0 0 10px ${C.goldGlow})` }} />
    </svg>
  );
};
