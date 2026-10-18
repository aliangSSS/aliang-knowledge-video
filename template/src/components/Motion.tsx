import { clamp, easeInOutCubic, easeOutCubic, hash, lerp, spring } from "../lib/anim";
import { C, FONT, glowText } from "../lib/theme";

/** Rolling number (tabular figures). Odometer feel with easeOut; `fmt` formats the value. */
export const Counter: React.FC<{ f: number; at: number; dur: number; from?: number; to: number; x: number; y: number; size?: number;
  color?: string; fmt?: (v: number) => string; glow?: boolean; latin?: boolean }> = ({
  f, at, dur, from = 0, to, x, y, size = 120, color = C.gold, fmt = (v) => Math.round(v).toLocaleString("en-US"), glow = true, latin = true,
}) => {
  const v = lerp(from, to, easeOutCubic(clamp((f - at) / Math.max(1, dur))));
  return (
    <div style={{ position: "absolute", left: x - 600, top: y - size * 0.6, width: 1200, textAlign: "center", fontFamily: latin ? FONT.en : FONT.zh,
      fontSize: size, color, fontVariantNumeric: "tabular-nums", textShadow: glow ? glowText(C.goldGlow, 0.6) : undefined }}>
      {fmt(v)}
    </div>
  );
};

/** Catmull-Rom through points → smooth SVG path. */
export const smooth = (pts: [number, number][]) => {
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
};

/** A line that draws itself from 0→1 over [at, at+dur] with an optional glowing head riding its tip (red thread,
 * a light trail, a route on a map, a signal along a wire). Pass points (smoothed) so the head can be placed. */
export const DrawPath: React.FC<{ pts: [number, number][]; f: number; at: number; dur: number; color?: string; width?: number;
  head?: boolean; glow?: boolean; opacity?: number; dash?: string; sag?: number }> = ({
  pts, f, at, dur, color = C.gold, width = 2.5, head = true, glow = true, opacity = 1, dash, sag = 0,
}) => {
  const P: [number, number][] = sag && pts.length === 2
    ? Array.from({ length: 9 }, (_, i) => { const u = i / 8; return [lerp(pts[0][0], pts[1][0], u), lerp(pts[0][1], pts[1][1], u) + sag * 4 * u * (1 - u)]; })
    : pts;
  const k = easeInOutCubic(clamp((f - at) / Math.max(1, dur)));
  if (k <= 0) return null;
  const segs = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1]));
  const L = segs.reduce((a, b) => a + b, 0);
  let rem = k * L, hx = P[0][0], hy = P[0][1];
  for (let i = 0; i < segs.length; i++) {
    if (rem <= segs[i]) { const u = rem / segs[i]; hx = lerp(P[i][0], P[i + 1][0], u); hy = lerp(P[i][1], P[i + 1][1], u); break; }
    rem -= segs[i]; hx = P[i + 1][0]; hy = P[i + 1][1];
  }
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }} width={1} height={1}>
      <path d={smooth(P)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={dash ?? "1 1"}
        strokeDashoffset={dash ? undefined : 1 - k} style={glow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined} />
      {head && k < 1 && <circle cx={hx} cy={hy} r={width * 2.2} fill="#fff6e6" style={{ filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color})` }} />}
    </svg>
  );
};

/** Particle burst from a point (impact dust, sparks, ink spatter): n seeded particles fly out and fade. */
export const Burst: React.FC<{ f: number; at: number; x: number; y: number; n?: number; r?: number; dur?: number; color?: string; size?: number; seed?: number; up?: number }> = ({
  f, at, x, y, n = 24, r = 160, dur = 28, color = C.gold, size = 4, seed = 1, up = 0,
}) => {
  const k = (f - at) / dur;
  if (k < 0 || k > 1) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = hash(i, 1, seed) * Math.PI * 2, d = r * (0.4 + 0.6 * hash(i, 2, seed)) * easeOutCubic(k);
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 - up * k + 80 * k * k * (up ? 1 : 0);
        const s = size * (0.5 + hash(i, 3, seed));
        return <div key={i} style={{ position: "absolute", left: px - s / 2, top: py - s / 2, width: s, height: s, borderRadius: "50%",
          background: color, opacity: (1 - k) * 0.9, boxShadow: `0 0 ${s * 2}px ${color}` }} />;
      })}
    </>
  );
};

/** A rubber stamp slamming down: oversize → lands with a squash, slight rotation, worn-ink speckle. Text or children.
 * Pair the event with sfx "stamp" and "shake": 10. */
export const Stamp: React.FC<{ f: number; at: number; x: number; y: number; text?: string; sub?: string; color?: string; size?: number;
  rot?: number; box?: boolean; children?: React.ReactNode; seed?: number }> = ({
  f, at, x, y, text, sub, color = C.crimson, size = 72, rot = -8, box = true, children, seed = 3,
}) => {
  if (f < at - 4) return null;
  const k = clamp((f - (at - 4)) / 4);
  const sq = spring(f, at, 10, 0.3);
  const sc = f < at ? 2.4 - 1.4 * k * k : 1 + 0.08 * (1 - sq);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${sc}) scaleY(${f < at ? 1 : 0.94 + 0.06 * sq})`,
      opacity: f < at ? 0.6 * k : 0.92, color, textAlign: "center", whiteSpace: "nowrap" }}>
      <div style={{ position: "relative", border: box ? `${Math.max(3, size / 14)}px solid ${color}` : undefined, borderRadius: 6,
        padding: box ? `${size * 0.12}px ${size * 0.35}px` : 0 }}>
        {children ?? (
          <>
            <div style={{ fontFamily: FONT.zh, fontWeight: 400, fontSize: size, letterSpacing: "0.2em", paddingLeft: "0.2em", lineHeight: 1.15 }}>{text}</div>
            {sub && <div style={{ fontFamily: FONT.en, fontSize: size * 0.24, letterSpacing: "0.4em", paddingLeft: "0.4em", marginTop: 4 }}>{sub}</div>}
          </>
        )}
        {Array.from({ length: 26 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: `${hash(i, 5, seed) * 100}%`, top: `${hash(i, 6, seed) * 100}%`,
            width: 2 + 6 * hash(i, 7, seed), height: 2 + 4 * hash(i, 8, seed), background: "#08080a", opacity: 0.55, borderRadius: 2 }} />
        ))}
      </div>
    </div>
  );
};
