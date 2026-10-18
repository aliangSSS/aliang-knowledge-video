import { C } from "../lib/theme";

/** The film's visual motif: a glowing point (radial gradient core + 2–3 halo layers, additive blend).
 * Only gold things glow; pass color=C.cyan / C.crimson with glow={0} for non-glowing dots. */
export const GlowDot: React.FC<{
  x: number;
  y: number;
  r?: number; // core radius px
  intensity?: number; // 0..1+ (also scales the halo)
  color?: string;
  halo?: string;
  glow?: number; // halo size multiplier, 0 = no halo
}> = ({ x, y, r = 6, intensity = 1, color = C.gold, halo = C.goldGlow, glow = 1 }) => {
  if (intensity <= 0.001) return null;
  const layer = (size: number, inner: string, a: number) => (
    <div
      style={{
        position: "absolute", left: x - size, top: y - size, width: size * 2, height: size * 2, borderRadius: "50%",
        background: `radial-gradient(circle, ${inner} 0%, ${inner}00 70%)`, opacity: Math.min(1, a * intensity),
        mixBlendMode: "screen", pointerEvents: "none",
      }}
    />
  );
  return (
    <>
      {glow > 0 && layer(r * 14 * glow * (0.7 + 0.3 * intensity), halo, 0.18)}
      {glow > 0 && layer(r * 5 * glow, halo, 0.45)}
      {layer(r * 2.2, color, 1)}
      <div
        style={{
          position: "absolute", left: x - r * 0.6, top: y - r * 0.6, width: r * 1.2, height: r * 1.2, borderRadius: "50%",
          background: "#fffaf0", opacity: Math.min(1, intensity), mixBlendMode: "screen",
        }}
      />
    </>
  );
};
