import { easeInOutCubic, lerp, ramp } from "../lib/anim";
import { C, W } from "../lib/theme";
import { GlowDot } from "./Glow";

/** A white-gold point with a tail sliding along a thin horizon line that crosses the frame. */
export const LightStreak: React.FC<{ f: number; from: number; to: number; y: number; x0?: number; x1?: number; tail?: number; line?: boolean }> = ({
  f, from, to, y, x0 = -80, x1 = W + 80, tail = 420, line = true,
}) => {
  const k = ramp(f, from, to, easeInOutCubic);
  const x = lerp(x0, x1, k);
  const lineA = line ? Math.min(ramp(f, from - 12, from + 6), 1 - ramp(f, to, to + 40)) * 0.35 : 0;
  const moving = f >= from - 1 && f <= to + 18;
  const tailA = f <= to ? 1 : 1 - ramp(f, to, to + 18);
  return (
    <>
      {lineA > 0 && <div style={{ position: "absolute", left: 0, top: y, width: W, height: 1, background: C.text, opacity: lineA }} />}
      {moving && (
        <>
          <div
            style={{
              position: "absolute", left: x - tail, top: y - 1.5, width: tail, height: 3, opacity: tailA,
              background: `linear-gradient(90deg, ${C.goldGlow}00, ${C.goldGlow}88 70%, #fff8e8)`, filter: "blur(0.6px)",
            }}
          />
          <GlowDot x={x} y={y} r={5} intensity={tailA} color="#fffaf0" />
        </>
      )}
    </>
  );
};
