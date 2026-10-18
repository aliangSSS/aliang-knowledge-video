import { pulse } from "../lib/anim";
import { C, H, W } from "../lib/theme";
import { GlowDot } from "./Glow";

/** A row of progress dots; dot i lights (gold, with a small pop) at frame litAt[i]. */
export const Dots: React.FC<{ n: number; f: number; litAt: number[]; y?: number; gap?: number; opacity?: number }> = ({
  n, f, litAt, y = H * 0.66, gap = 46, opacity = 1,
}) => {
  const x0 = W / 2 - ((n - 1) * gap) / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + i * gap;
        const on = litAt[i] !== undefined && f >= litAt[i];
        if (!on)
          return <div key={i} style={{ position: "absolute", left: x - 6, top: y - 6, width: 12, height: 12, borderRadius: "50%", border: `1.5px solid ${C.cyan}`, opacity: 0.7 }} />;
        return <GlowDot key={i} x={x} y={y} r={5 + 3 * pulse(f, litAt[i], 10)} intensity={0.8 + 0.6 * pulse(f, litAt[i], 12)} />;
      })}
    </div>
  );
};
