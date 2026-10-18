import { hash } from "../lib/anim";
import { C, W } from "../lib/theme";

/** Calm cyan sine (predictable) vs. jagged crimson noise (surprise / interference).
 * noise 0..1 blends the clean wave into seeded noise; phase moves it (pass f * speed). */
export const Wave: React.FC<{
  y: number;
  amp?: number;
  freq?: number; // cycles across the width
  noise?: number;
  phase?: number;
  color?: string;
  x0?: number;
  x1?: number;
  width?: number;
  opacity?: number;
  seed?: number;
  glow?: boolean;
}> = ({ y, amp = 60, freq = 3, noise = 0, phase = 0, color, x0 = 160, x1 = W - 160, width = 2, opacity = 1, seed = 1, glow = false }) => {
  const n = 240;
  const col = color ?? (noise > 0.5 ? C.crimson : C.cyan);
  let d = "";
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const clean = Math.sin(2 * Math.PI * (u * freq) + phase);
    const k = Math.floor(i + phase * 7);
    const nz = (hash(k, 0, seed) * 2 - 1) * 1.4;
    const v = clean * (1 - noise) + nz * noise;
    d += `${i ? "L" : "M"}${(x0 + u * (x1 - x0)).toFixed(1)},${(y - v * amp).toFixed(1)}`;
  }
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", opacity }} width={W} height={1}>
      <path d={d} fill="none" stroke={col} strokeWidth={width} strokeLinejoin="round"
        style={glow ? { filter: `drop-shadow(0 0 8px ${C.goldGlow})` } : undefined} />
    </svg>
  );
};
