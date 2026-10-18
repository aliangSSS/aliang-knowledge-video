import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { easeInOutCubic, lerp, ramp, rng } from "../lib/anim";
import { C, FONT, H, W, glowText } from "../lib/theme";

type P = { x: number; y: number; sx: number; sy: number; d: number };

/** Particles drift in from a wide scatter and converge into the text over [from, to] (scene frames);
 * the crisp, glowing text cross-fades in as they land. Used for the title. */
export const ParticleText: React.FC<{
  text: string;
  f: number;
  from: number;
  to: number;
  y?: number;
  size?: number;
  spacing?: number; // letter-spacing in em
  color?: string;
  weight?: number;
  seed?: number;
  glow?: number; // text glow once landed; 0 for white titles (only gold things glow)
}> = ({ text, f, from, to, y = H * 0.42, size = 112, spacing = 0.35, color = C.gold, weight = 400, seed = 3, glow = 0.8 }) => {
  const [pts, setPts] = useState<P[] | null>(null);
  const [handle] = useState(() => delayRender("particle text"));
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    let alive = true;
    document.fonts.load(`${weight} ${size}px "Noto Serif SC"`, text).then(() => {
      if (!alive) return;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;
      ctx.font = `${weight} ${size}px ${FONT.zh}`;
      (ctx as any).letterSpacing = `${spacing * size}px`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(text, W / 2 + (spacing * size) / 2, y);
      const img = ctx.getImageData(0, 0, W, H).data;
      const step = Math.max(2, Math.round(size / 30));
      const all: [number, number][] = [];
      for (let yy = Math.max(0, Math.floor(y - size)); yy < Math.min(H, y + size); yy += step)
        for (let xx = 0; xx < W; xx += step) if (img[(yy * W + xx) * 4 + 3] > 128) all.push([xx, yy]);
      const r = rng(seed);
      const keep = all.filter(() => r() < Math.min(1, 2600 / Math.max(1, all.length)));
      setPts(keep.map(([x, py]) => {
        const a = r() * Math.PI * 2, d = 250 + r() * 950;
        return { x, y: py, sx: W / 2 + Math.cos(a) * d, sy: y + Math.sin(a) * d * 0.55, d: r() };
      }));
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
  }, [text, size, spacing, y, seed, weight, handle]);

  const sprite = useMemo(() => {
    if (typeof document === "undefined") return null;
    const s = document.createElement("canvas");
    s.width = s.height = 16;
    const g = s.getContext("2d")!;
    const grd = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grd.addColorStop(0, "rgba(255,248,226,1)");
    grd.addColorStop(0.35, "rgba(246,211,146,0.75)");
    grd.addColorStop(1, "rgba(227,170,94,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 16, 16);
    return s;
  }, []);

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || !pts || !sprite) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    const fade = (1 - ramp(f, to, to + 18)) * ramp(f, from, from + 8);
    if (fade <= 0) return;
    ctx.globalCompositeOperation = "lighter";
    for (const p of pts) {
      const k = ramp(f, from + p.d * (to - from) * 0.35, to, easeInOutCubic);
      const sz = 3 + 9 * (1 - k);
      ctx.globalAlpha = (0.25 + 0.75 * k) * fade;
      ctx.drawImage(sprite, lerp(p.sx, p.x, k) - sz / 2, lerp(p.sy, p.y, k) - sz / 2, sz, sz);
    }
  }, [f, pts, sprite, from, to]);

  return (
    <>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute", top: y - size * 0.6, width: "100%", textAlign: "center", fontFamily: FONT.zh, fontWeight: weight,
          fontSize: size, lineHeight: 1.2, letterSpacing: `${spacing}em`, paddingLeft: `${spacing}em`, color,
          opacity: ramp(f, to - 10, to + 12), textShadow: glow ? glowText(C.goldGlow, glow) : undefined,
        }}
      >
        {text}
      </div>
    </>
  );
};
