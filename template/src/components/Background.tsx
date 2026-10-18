import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { hash, rng } from "../lib/anim";
import { C, H, W } from "../lib/theme";

/** Global backdrop, configured per film with storyboard meta.bg (or meta.bg: false to let World draw its own).
 * Default: near-black blue centre, corners pushed to #020202, sparse slow star dust, very light static grain.
 * Change centre / edge / stars to suit the topic's world (warmer for paper and wood, colder for space, none for a lab). */
export const Background: React.FC<{ center?: string; edge?: string; stars?: number; seed?: number; drift?: number; grain?: number; starColor?: string }> = ({
  center = C.bgCenter, edge = C.bgEdge, stars = 140, seed = 7, drift = 1, grain = 0.5, starColor = "#dfe6ee",
}) => {
  const f = useCurrentFrame();
  const pts = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: stars }, () => ({
      x: r() * W, y: r() * H, s: 0.6 + r() * 1.4, a: 0.08 + r() * 0.32, v: 0.2 + r() * 0.8, tw: r() * 6.28,
    }));
  }, [stars, seed]);
  const tex = useMemo(() => {
    if (typeof document === "undefined" || !grain) return "";
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const v = Math.floor(hash(i, 3, seed) * 255);
      img.data.set([v, v, v, 10], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }, [seed, grain]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 75% at 50% 48%, ${center} 0%, ${edge} 100%)` }}>
      {stars > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {pts.map((p, i) => {
            const x = (p.x + f * 0.06 * p.v * drift) % W;
            const y = p.y - f * 0.015 * p.v * drift;
            const a = p.a * (0.75 + 0.25 * Math.sin(f / 40 + p.tw));
            return <circle key={i} cx={x} cy={((y % H) + H) % H} r={p.s} fill={starColor} opacity={a} />;
          })}
        </svg>
      )}
      {tex && <AbsoluteFill style={{ backgroundImage: `url(${tex})`, opacity: grain, mixBlendMode: "screen" }} />}
    </AbsoluteFill>
  );
};
