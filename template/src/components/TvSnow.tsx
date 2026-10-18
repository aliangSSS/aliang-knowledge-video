import { useLayoutEffect, useRef } from "react";
import { hash } from "../lib/anim";
import { H, W } from "../lib/theme";

/** Full-screen TV static, seeded per frame (deterministic). Rendered small and scaled up pixelated. */
export const TvSnow: React.FC<{ f: number; opacity?: number; scale?: number; seed?: number; tint?: [number, number, number] }> = ({
  f, opacity = 1, scale = 4, seed = 9, tint = [235, 235, 233],
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.ceil(W / scale), h = Math.ceil(H / scale);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = hash(i, f, seed);
      img.data[i * 4] = tint[0] * v;
      img.data[i * 4 + 1] = tint[1] * v;
      img.data[i * 4 + 2] = tint[2] * v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [f, w, h, seed, tint]);
  if (opacity <= 0) return null;
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", inset: 0, width: W, height: H, imageRendering: "pixelated", opacity }} />;
};
