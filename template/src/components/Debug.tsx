import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS, TL } from "../lib/timeline";

const nearest = (f: number, xs: number[]) => {
  let lo = 0, hi = xs.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (xs[m] < f) lo = m + 1;
    else hi = m;
  }
  const i = lo > 0 && Math.abs(xs[lo - 1] - f) <= Math.abs(xs[lo] - f) ? lo - 1 : lo;
  return { i, d: f - xs[i] };
};

/** Top-right: frame, nearest beat, current scene & last cue. A marker flashes on every beat (bigger on downbeats). */
export const DebugOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const b = nearest(f, TL.beats);
  const down = TL.downbeats.includes(f);
  const on = TL.beats.includes(f) || TL.beats.includes(f - 1);
  const sc = TL.scenes.find((s) => f >= s.from && f < s.from + s.dur);
  const cue = [...TL.cues].reverse().find((c) => c.f <= f);
  const fresh = cue && f - cue.f < 6;
  const box: React.CSSProperties = { fontFamily: "Consolas, Menlo, monospace", fontSize: 26, color: "#9ef", lineHeight: 1.35 };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", right: 30, top: 24, textAlign: "right", background: "rgba(0,0,0,0.55)", padding: "10px 16px", ...box }}>
        <div>f {f} · {(f / FPS).toFixed(2)}s</div>
        <div>beat #{b.i} {b.d >= 0 ? "+" : ""}{b.d}f</div>
        <div>{sc?.id ?? "-"}</div>
        <div style={{ color: fresh ? "#ff0" : "#9ef" }}>{cue ? `${cue.name} @${cue.f}` : "-"}</div>
      </div>
      {on && (
        <div style={{ position: "absolute", right: 40, top: 200, width: down ? 46 : 24, height: down ? 46 : 24, borderRadius: "50%", background: down ? "#f33" : "#fd3" }} />
      )}
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${(100 * f) / TL.frames}%`, background: "#9ef" }} />
    </AbsoluteFill>
  );
};
