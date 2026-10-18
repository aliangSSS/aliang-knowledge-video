import { clamp, easeInOutCubic, easeOutCubic, hash } from "./anim";
import { Trans } from "./timeline";
import { C, H, W } from "./theme";

const eic = easeInOutCubic;
type Out = { style: React.CSSProperties; overlay?: React.ReactNode };
/** Opacity of the incoming / outgoing scene across a pan (k 0→1). Exported so a World can fade card thumbnails
 * in exact complement to a scene's live drawing. */
export const panIn = (k: number) => eic(clamp((k - 0.72) / 0.28));
export const panOut = (k: number) => 1 - eic(clamp(k / 0.25));

/** Screen-space styling of a scene while it takes part in a transition. role "in" = the incoming scene,
 * "out" = the outgoing one; p = 0→1 across the transition window (absolute frame F for frame-noise effects).
 * Types: cut · flash · fade · black · pan (camera move; handled by the camera) · push · whip · zoom · wipe · iris ·
 * blur · rise · glitch. */
export const transStyle = (t: Trans, role: "in" | "out", p: number, F: number): Out => {
  const k = clamp(p);
  const d = t.dir || 1, ax = t.axis || "x";
  const tr = (v: number) => (ax === "x" ? `translateX(${v}px)` : `translateY(${v}px)`);
  const span = ax === "x" ? W : H;
  const io = role === "in";
  switch (t.type) {
    case "fade":
      return { style: { opacity: io ? eic(k) : 1 - eic(k) } };
    case "black": // out fades to black over the first half, in fades up over the second
      return { style: { opacity: io ? eic(clamp(k * 2 - 1)) : 1 - eic(clamp(k * 2)) } };
    case "pan": // the camera does the travelling; the old scene leaves early, the new one arrives as the camera lands
      return { style: { opacity: io ? panIn(k) : panOut(k) } };
    case "push":
      return { style: { transform: tr(-d * span * (io ? eic(k) - 1 : eic(k))) } };
    case "whip": {
      const e = k < 0.5 ? 0.5 * Math.pow(k * 2, 3) : 1 - 0.5 * Math.pow((1 - k) * 2, 3); // very fast through the middle
      const blur = 26 * Math.sin(Math.PI * k);
      return {
        style: {
          transform: `${tr(-d * span * (io ? e - 1 : e))} ${ax === "x" ? "scaleX" : "scaleY"}(${1 + 0.25 * Math.sin(Math.PI * k)})`,
          filter: `blur(${blur.toFixed(1)}px)`,
        },
      };
    }
    case "zoom": // push through: the old scene flies past the lens, the new one arrives from far away
      return io
        ? { style: { transform: `scale(${0.6 + 0.4 * easeOutCubic(k)})`, opacity: clamp(k * 1.6 - 0.2), transformOrigin: `${t.at[0]}px ${t.at[1]}px` } }
        : { style: { transform: `scale(${1 + 2.5 * k * k})`, opacity: 1 - eic(clamp(k * 1.4)), filter: `blur(${(8 * k).toFixed(1)}px)`, transformOrigin: `${t.at[0]}px ${t.at[1]}px` } };
    case "wipe": {
      if (!io) return { style: {} };
      const r = (1 - eic(k)) * 100;
      const clip = ax === "x" ? (d > 0 ? `inset(0 0 0 ${r}%)` : `inset(0 ${r}% 0 0)`) : d > 0 ? `inset(${r}% 0 0 0)` : `inset(0 0 ${r}% 0)`;
      const pos = (d > 0 ? r : 100 - r) / 100;
      const edge = ax === "x"
        ? { left: pos * W - 1, top: 0, width: 2, height: H }
        : { left: 0, top: pos * H - 1, width: W, height: 2 };
      return {
        style: { clipPath: clip },
        overlay: k < 1 ? <div style={{ position: "absolute", ...edge, background: C.gold, boxShadow: `0 0 18px ${C.goldGlow}, 0 0 40px ${C.goldGlow}` }} /> : null,
      };
    }
    case "iris": {
      if (!io) return { style: { opacity: 1 - clamp(k * 1.5 - 0.5) } };
      const R = Math.hypot(Math.max(t.at[0], W - t.at[0]), Math.max(t.at[1], H - t.at[1])) * eic(k);
      return {
        style: { clipPath: `circle(${R.toFixed(0)}px at ${t.at[0]}px ${t.at[1]}px)` },
        overlay: k < 1 ? (
          <div style={{ position: "absolute", left: t.at[0] - R, top: t.at[1] - R, width: 2 * R, height: 2 * R, borderRadius: "50%",
            border: `2px solid ${C.gold}`, boxShadow: `0 0 24px ${C.goldGlow}`, opacity: 1 - k }} />
        ) : null,
      };
    }
    case "blur":
      return { style: { opacity: io ? eic(k) : 1 - eic(k), filter: `blur(${(14 * (io ? 1 - k : k)).toFixed(1)}px)` } };
    case "rise":
      return { style: { opacity: io ? eic(k) : 1 - eic(k), transform: `translateY(${(io ? (1 - eic(k)) * 90 : -eic(k) * 90) * d}px)` } };
    case "glitch": {
      const amp = 40 * Math.exp(-Math.pow((k - 0.5) / 0.22, 2));
      const jx = (hash(F, 1) - 0.5) * amp, jy = (hash(F, 2) - 0.5) * amp * 0.3;
      const show = io ? k >= 0.5 : k < 0.5;
      return {
        style: {
          opacity: show ? 1 : 0,
          transform: `translate(${jx.toFixed(1)}px, ${jy.toFixed(1)}px)`,
          filter: amp > 2 ? `drop-shadow(${(amp / 4).toFixed(1)}px 0 0 rgba(255,40,80,0.7)) drop-shadow(${(-amp / 4).toFixed(1)}px 0 0 rgba(40,220,255,0.7))` : undefined,
        },
      };
    }
    default: // cut / flash: no window
      return { style: {} };
  }
};
