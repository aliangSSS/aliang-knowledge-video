import { useLayoutEffect, useRef } from "react";
import { hash } from "../lib/anim";
import { H, W } from "../lib/theme";

const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, s: number) => {
  let t = 0, amp = 0.5, fr = 1;
  for (let o = 0; o < 5; o++, amp *= 0.5, fr *= 2) t += amp * vnoise(x * fr, y * fr, s + o);
  return t / 0.97;
};
/** turbo-like colormap */
const turbo = (x: number): [number, number, number] => {
  const k = Math.min(1, Math.max(0, (x - 0.22) / 0.56));
  const r = 34.61 + k * (1172.33 + k * (-10793.56 + k * (33300.12 + k * (-38394.49 + k * 14825.05))));
  const g = 23.31 + k * (557.33 + k * (1225.33 + k * (-3574.96 + k * (1073.77 + k * 707.56))));
  const b = 27.2 + k * (3211.1 + k * (-15327.97 + k * (27814 + k * (-22569.18 + k * 6838.66))));
  return [r, g, b].map((c) => Math.max(0, Math.min(255, c))) as [number, number, number];
};

/** The film's single full-colour image: a fine-grained, high-saturation fractal field. With `ellipse` (default) it sits
 * in an all-sky oval and reads as a sky map; without, as a full-frame thermal / data map.
 * `reveal` 0→1 opens it from the centre; `t` drifts it slowly; `grain` = feature size in px. Use ONCE, at the twist. */
export const ColorField: React.FC<{ reveal: number; t?: number; seed?: number; scale?: number; opacity?: number; ellipse?: boolean; grain?: number; cy?: number }> = ({
  reveal, t = 0, seed = 2, scale = 4, opacity = 1, ellipse = true, grain = 40, cy = 0.42,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.ceil(W / scale), h = Math.ceil(H / scale);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    // the oval stays above the subtitle zone (bottom edge ≈ 78 % of the height)
    const rx = ellipse ? w * 0.43 : w * 0.75, ry = ellipse ? h * 0.36 : h * 0.75, g0 = grain / scale, yc = ellipse ? h * cy : h / 2;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dist = Math.hypot((x - w / 2) / rx, (y - yc) / ry);
        const edge = Math.min(1, Math.max(0, (reveal - dist) * rx / 3));
        if (edge <= 0) {
          img.data[i + 3] = 0;
          continue;
        }
        const [r, g, b] = turbo(fbm(x / g0 + t * 0.05, y / g0 - t * 0.03, seed));
        img.data[i] = r * edge;
        img.data[i + 1] = g * edge;
        img.data[i + 2] = b * edge;
        img.data[i + 3] = 255 * edge;
      }
    ctx.putImageData(img, 0, 0);
  }, [reveal, t, w, h, seed, ellipse, grain]);
  if (reveal <= 0 || opacity <= 0) return null;
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", inset: 0, width: W, height: H, opacity, filter: "blur(0.8px)" }} />;
};
