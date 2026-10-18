import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Burst, DrawPath, Kinetic, Meta, Stamp } from "../components";
import { card, cardRect } from "../board";
import { CardSpace } from "../CardSpace";
import { clamp, easeInOutCubic, hash, lastIdx, lerp, pulse, ramp, rng, settle } from "../lib/anim";
import { useScene } from "../lib/timeline";
import { C, FONT, glowText } from "../lib/theme";

/** Exhibit 4: a month ticks past day by day; most days light and vanish, three bad ones stay crimson. */
export const MemoryCalendar: React.FC = () => {
  const { f, props: p, ev, scene } = useScene();
  const r = cardRect(card("calendar"), scene);
  const days = ev("days").fs, bad = ev("bad").fs;
  const cw = (r.w - 120 * r.k) / 6, ch = (r.h - 120 * r.k) / 5;
  return (
    <CardSpace id="calendar">
      {Array.from({ length: 30 }, (_, d) => {
        const x = r.cx - r.w / 2 + 60 * r.k + (d % 6) * cw, y = r.cy - r.h / 2 + 60 * r.k + Math.floor(d / 6) * ch;
        const bi = (p.bad as number[]).indexOf(d);
        const t = days[d] ?? 0;
        const isBad = bi >= 0 && f >= bad[bi];
        const glow = f >= t ? Math.exp(-(f - t) / 10) : 0;
        return (
          <div key={d} style={{ position: "absolute", left: x + 6, top: y + 6, width: cw - 12, height: ch - 12,
            border: `2px solid ${isBad ? C.crimson : `rgba(237,237,233,${0.15 + 0.6 * glow})`}`,
            background: isBad ? `rgba(165,58,91,${0.35 + 0.3 * pulse(f, bad[bi], 16)})` : `rgba(246,211,146,${0.25 * glow})`,
            transform: isBad ? `scale(${1 + 0.12 * pulse(f, bad[bi], 12)})` : undefined }}>
            <div style={{ position: "absolute", left: 10, top: 6, fontFamily: FONT.en, fontSize: 22, color: isBad ? "#ffd0da" : C.dim, opacity: f >= t ? 1 : 0.35 }}>{d + 1}</div>
            {isBad && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", fontFamily: FONT.zh, fontSize: 24, color: "#ffd0da",
                opacity: ramp(f, bad[bi], bad[bi] + 10) }}>{p.badZh[bi]}</div>
            )}
          </div>
        );
      })}
      <Meta corner="tr" opacity={ramp(f, ev("thread").f, ev("thread").f + 20)}>{p.meta}</Meta>
    </CardSpace>
  );
};

/** 62–77 s: a counter accelerates (×1 … ×1000) over a rain of small events, 1 in 100 crimson → vacuum →
 * 66.58 drop: the formula slams in, stamped 真凶; then the curve P(n) draws with beat-locked marks. */
export const Culprit: React.FC = () => {
  const { f, props: p, ev } = useScene();
  const roll = ev("count"), hit = ev("hit").f, cv = ev("curve").f, mk = ev("marks").fs;
  const ti = lastIdx(f, roll.ticks);
  const drops = useMemo(() => { const r = rng(5); return Array.from({ length: 200 }, () => ({ x: r() * 1920, v: 6 + r() * 10, o: r() * 1000, bad: r() < 0.03 })); }, []);
  const dens = clamp((ti + 1) / roll.ticks.length);
  const vac = ramp(f, hit - 10, hit - 2);
  const up = ramp(f, cv - 6, cv + 18, easeInOutCubic);
  const X0 = 520, X1 = 1400, YB = 780, YT = 470, P = (n: number) => 1 - Math.pow(0.99, n), X = (n: number) => lerp(X0, X1, n / 500), Y = (v: number) => lerp(YB, YT, v);
  const pts: [number, number][] = Array.from({ length: 41 }, (_, i) => [X(i * 12.5), Y(P(i * 12.5))]);
  return (
    <AbsoluteFill>
      {f < hit && (
        <AbsoluteFill style={{ opacity: 1 - vac }}>
          {drops.slice(0, Math.floor(70 + 130 * dens)).map((d, i) => {
            const y = ((d.o + f * d.v) % 1100) - 20;
            return <div key={i} style={{ position: "absolute", left: d.x, top: y, width: d.bad ? 7 : 4, height: d.bad ? 7 : 4, borderRadius: "50%",
              background: d.bad ? C.crimson : C.text, opacity: d.bad ? 0.9 : 0.5 }} />;
          })}
          {(
            <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: FONT.en, fontSize: 150, color: C.text,
              opacity: ramp(f, 4, 16), transform: `scale(${1 + 0.12 * (ti >= 0 ? pulse(f, roll.ticks[ti], 6) : 0)})` }}>
              ×{ti < 0 ? 1 : p.counts[Math.min(ti, p.counts.length - 1)]}<span style={{ fontFamily: FONT.zh, fontSize: 60, marginLeft: 16, opacity: 0.6 }}>{p.unit}</span>
            </div>
          )}
        </AbsoluteFill>
      )}
      {f >= hit && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: lerp(330, 210, up), transform: `scale(${lerp(1, 0.72, up) * settle(f, hit, hit + 10, 0.04)})`,
            textAlign: "center", fontFamily: FONT.en, fontStyle: "italic", fontSize: 130, color: C.gold, textShadow: glowText(C.goldGlow, 0.6 + 1.2 * pulse(f, hit, 30)) }}>
            P = 1 − (1 − p)<sup style={{ fontSize: "0.55em" }}>n</sup>
          </div>
          <Stamp f={f} at={hit + 3} x={1470} y={lerp(300, 200, up)} text={p.stamp} size={70} rot={-12} />
          <Burst f={f} at={hit} x={960} y={400} n={40} r={700} dur={34} color={C.gold} size={5} />
          <div style={{ position: "absolute", top: lerp(500, 360, up), width: "100%", textAlign: "center", fontFamily: FONT.zh, fontSize: 30, letterSpacing: "0.4em",
            color: C.gold, opacity: ramp(f, hit + 20, hit + 36) }}>{p.zh} · <span style={{ fontFamily: FONT.en, fontSize: 22 }}>{p.en.toUpperCase()}</span></div>
        </>
      )}
      {f >= cv - 6 && (
        <AbsoluteFill style={{ opacity: up }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <line x1={X0} x2={X1} y1={YB} y2={YB} stroke={C.text} strokeOpacity={0.4} />
            <line x1={X0} x2={X0} y1={YB} y2={YT - 20} stroke={C.text} strokeOpacity={0.4} />
            {[0, 100, 200, 300, 400, 500].map((n) => <text key={n} x={X(n)} y={YB + 34} textAnchor="middle" fontFamily="Lora, serif" fontSize={22} fill={C.text} fillOpacity={0.5}>{n}</text>)}
          </svg>
          <DrawPath pts={pts} f={f} at={cv} dur={50} width={4} />
          {p.marks.map((m: { n: number; v: string }, i: number) => mk[i] !== undefined && f >= mk[i] && (
            <div key={i}>
              <div style={{ position: "absolute", left: X(m.n) - 9, top: Y(P(m.n)) - 9, width: 18, height: 18, borderRadius: "50%", background: "#fff6e6",
                boxShadow: `0 0 18px ${C.goldGlow}`, transform: `scale(${1 + 0.6 * pulse(f, mk[i], 12)})` }} />
              <div style={{ position: "absolute", left: X(m.n) - 100, top: Y(P(m.n)) - 70, width: 200, textAlign: "center", fontFamily: FONT.en, fontSize: 40, color: C.gold,
                textShadow: glowText(C.goldGlow, 0.4) }}>{m.v}</div>
            </div>
          ))}
          <div style={{ position: "absolute", left: X1 - 150, top: YB + 50, width: 150, textAlign: "right", fontFamily: FONT.zh, fontSize: 22, color: C.dim, letterSpacing: "0.3em" }}>{p.xZh}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

type Pt = { x: number; y: number; b: number; s: number };
/** 77–87 s: pull back from one gold point (you) to a building, a block, a city of lights; crimson flickers = bad luck. */
export const CityZoom: React.FC = () => {
  const { f, props: p, ev } = useScene();
  const lv = ev("levels").fs, fl = ev("flicker").fs;
  const ref = useRef<HTMLCanvasElement>(null);
  const pts = useMemo<Pt[]>(() => {
    // a city of lit windows seen from above: blocks of 4×3 windows on an 8-unit street grid, some parks left dark
    const r = rng(9), out: Pt[] = [];
    for (let bx = -15; bx < 15; bx++)
      for (let by = -9; by < 9; by++) {
        const home = bx === 0 && by === 0;
        const d = Math.hypot(bx / 15, by / 9); // density and brightness fall off from the centre
        const river = Math.abs(by * 8 + 14 - 22 * Math.sin(bx / 3.2)) < 5;
        if (!home && (river || r() < 0.1 + 0.5 * d * d)) continue;
        const nw = 2 + Math.floor(r() * 4), nh = 2 + Math.floor(r() * 3), jx = (r() - 0.5) * 2.4, jy = (r() - 0.5) * 2.4;
        for (let i = 0; i < nw; i++)
          for (let j = 0; j < nh; j++) {
            if (!home && r() < 0.25 + 0.4 * d) continue;
            out.push({ x: home ? i * 1.3 - 1.95 : bx * 8 + jx + i * 1.3 - nw * 0.65, y: home ? j * 1.3 - 1.3 : by * 8 + jy + j * 1.3 - nh * 0.65,
              b: (0.3 + 0.7 * r()) * (1 - 0.6 * d), s: r() * 1e4 });
          }
      }
    return out;
  }, []);
  const Z = [260, 70, 20, 7.6];
  const li = Math.max(0, lastIdx(f, lv));
  // hold each level, then pull back during the last 60 % of its interval so the next label lands as the zoom arrives
  const nx = lv[li + 1] ?? lv[li] + 60;
  const zk = li < 3 ? easeInOutCubic(clamp((f - lerp(lv[li], nx, 0.4)) / Math.max(1, (nx - lv[li]) * 0.6))) : 0;
  const z = Math.exp(lerp(Math.log(Z[li]), Math.log(Z[Math.min(li + 1, 3)]), zk));
  const cx = 960, cy = 450;
  const flick = lastIdx(f, fl) >= 0;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 1920, 1080);
    for (const q of pts) {
      const x = cx + q.x * z, y = cy + q.y * z;
      if (x < -10 || x > 1930 || y < -10 || y > 1090) continue;
      if (Math.abs(q.x) < 0.1 && Math.abs(q.y - 0.0) < 0.1) continue; // "you" is drawn on top
      const red = flick && hash(q.s, Math.floor(f / 4)) < 0.012;
      ctx.fillStyle = red ? "rgba(255,80,110,0.95)" : `rgba(246,226,190,${(0.3 + 0.5 * q.b) * (0.8 + 0.2 * Math.sin(f / 9 + q.s))})`;
      const s = red ? Math.max(4, Math.min(16, z * 0.9)) : Math.max(1.6, Math.min(18, z * 0.75));
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }, [f, z, pts, flick]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: cx - 12, top: cy - 12, width: 24, height: 24, borderRadius: "50%", background: C.gold, boxShadow: `0 0 26px ${C.goldGlow}, 0 0 60px ${C.goldGlow}` }} />
      <div style={{ position: "absolute", left: cx - 60, top: cy - 70, width: 120, textAlign: "center", fontFamily: FONT.zh, fontSize: 30, color: C.gold, opacity: 1 - ramp(f, lv[1] ?? 60, (lv[1] ?? 60) + 20) }}>你</div>
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(2,2,2,0.9) 0%, rgba(2,2,2,0.55) 16%, rgba(2,2,2,0) 32%)" }} />
      <div style={{ position: "absolute", left: 70, top: 90, padding: "14px 30px 14px 20px", background: "linear-gradient(90deg, rgba(2,2,2,0.8), rgba(2,2,2,0))" }}>
        <Kinetic key={li} text={p.levels[li]} f={f} at={(lv[li] ?? 0) + 2} mode="rise" stagger={2} dur={10} x={20} y={30} size={46} spacing={0.3} align="left" />
      </div>
    </AbsoluteFill>
  );
};

/** Back on the wall: the defendant card "宇宙" is stamped 无罪 (World); a crimson line strikes the charge. */
export const Verdict: React.FC = () => {
  const { f, ev, scene } = useScene();
  const r = cardRect(card("suspect"), scene);
  const hit = ev("hit").f, who = ev("who").f;
  return (
    <AbsoluteFill>
      <DrawPath pts={[[r.cx + r.w * 0.06, r.cy + 3], [r.cx + r.w * 0.36, r.cy - 3]]} f={f} at={hit - 6} dur={8} color={C.crimson} width={5} head={false} />
      <div style={{ position: "absolute", left: r.cx - 40, top: r.cy - r.h / 2 - 190, width: 80, textAlign: "center", fontFamily: FONT.en, fontSize: 110, color: C.gold,
        opacity: ramp(f, who, who + 10), transform: `scale(${1 + 0.2 * pulse(f, who, 14)})`, textShadow: glowText(C.goldGlow, 0.6) }}>?</div>
    </AbsoluteFill>
  );
};
