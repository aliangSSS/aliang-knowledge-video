/** Pure frame-based animation helpers. No CSS transitions, no unseeded Math.random. */
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/** 0→1 over [a, b] (any unit, usually frames), eased. */
export const ramp = (x: number, a: number, b: number, ease: (v: number) => number = easeInOutCubic) =>
  ease(clamp((x - a) / Math.max(1e-6, b - a)));

/** Fade in over [a, a+fi], hold, fade out over [b-fo, b]. */
export const win = (x: number, a: number, b: number, fi = 6, fo = 6) =>
  Math.min(ramp(x, a, a + fi), 1 - ramp(x, b - fo, b));

/** Spike at `at` that decays over `d` (same unit as x). 0 before `at`. */
export const pulse = (x: number, at: number, d: number) => (x < at ? 0 : Math.exp(-(x - at) / Math.max(1e-6, d / 3)));

/** Number reveal with the only allowed overshoot (2–4 %). */
export const settle = (x: number, a: number, b: number, over = 0.03) => {
  const k = clamp((x - a) / Math.max(1e-6, b - a));
  return k < 0.7 ? easeOutCubic(k / 0.7) * (1 + over) : 1 + over * (1 - easeInOutCubic((k - 0.7) / 0.3));
};

/** Index of the last frame in `fs` that is <= f, or -1. */
export const lastIdx = (f: number, fs: number[]) => {
  let k = -1;
  for (let i = 0; i < fs.length; i++) if (fs[i] <= f) k = i;
  return k;
};

/** Damped spring 0→1 starting at frame `at` (x in frames). bounce 0 = critically damped, 0.5 = lively, 0.8 = rubbery.
 * Use for physical / mechanical / playful motion; keep calm topics on the eases above. */
export const spring = (x: number, at: number, dur = 18, bounce = 0.35) => {
  const t = (x - at) / Math.max(1, dur);
  if (t <= 0) return 0;
  if (t >= 3) return 1;
  const z = 1 - bounce, w = 9;
  return 1 - Math.exp(-z * w * t) * Math.cos(w * Math.sqrt(Math.max(0.01, 1 - z * z)) * t * (1 + bounce));
};

/** Gravity fall with a damped bounce on landing: 0 → 1 over [a, b] (frames), then small rebounds. */
export const fall = (x: number, a: number, b: number, bounces = 2, damp = 0.35) => {
  if (x <= a) return 0;
  const k = (x - a) / Math.max(1, b - a);
  if (k <= 1) return k * k;
  let t = (k - 1) * 2, h = damp;
  for (let i = 0; i < bounces; i++, h *= damp) {
    const span = Math.sqrt(h) * 2;
    if (t < span) return 1 - h * (1 - Math.pow(t / span * 2 - 1, 2));
    t -= span;
  }
  return 1;
};

/** Seeded PRNG (mulberry32). Same seed → same sequence on every render. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Deterministic hash noise in [0,1) for (i, j, seed). */
export const hash = (i: number, j = 0, seed = 0) => {
  const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
