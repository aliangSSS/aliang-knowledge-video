import { AbsoluteFill } from "remotion";
import { Burst, Kinetic, Meta } from "../components";
import { ICONS } from "../Icons";
import { card, cardRect } from "../board";
import { CardSpace } from "../CardSpace";
import { clamp, easeInOutCubic, easeOutCubic, lastIdx, lerp, pulse, ramp, spring } from "../lib/anim";
import { useScene } from "../lib/timeline";
import { C, FONT, glowText } from "../lib/theme";

const ORDER = ["battery", "queue", "toast", "umbrella", "knot"];

/** 0–10 s: one everyday mishap per bar, hard cuts on the downbeat, each with its own foley. */
export const Montage: React.FC = () => {
  const { f, props: p, ev, dur } = useScene();
  const cuts = [0, ...ev("cuts").fs];
  const i = Math.max(0, lastIdx(f, cuts));
  const a = cuts[i], b = cuts[i + 1] ?? dur;
  const win = (x: string, y: string) => [ev(x).f, ev(y).f];
  const prog = [
    ramp(f, ev("drain").fs[0], ev("dead").f + 4),
    ramp(f, ev("beeps").fs[0], ev("beeps").fs[3] + 8),
    ramp(f, ...(win("slide", "land") as [number, number]), (x) => x),
    ramp(f, ev("door").f - 6, ev("rain").f + 30),
    ramp(f, ...(win("wiggle", "knot") as [number, number])),
  ][i];
  const Icon = ICONS[ORDER[i]];
  const punch = 1 + 0.06 * pulse(f, a, 10);
  const dead = i === 0 && f >= ev("dead").f;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 70% at 50% 45%, rgba(10,14,22,0) 30%, rgba(0,0,0,0.65) 100%)" }}>
      <div style={{ position: "absolute", left: 960 - 520, top: 380 - 364, width: 1040, height: 728, transform: `scale(${punch * (1 + 0.03 * (f - a) / Math.max(1, b - a))})` }}>
        <svg viewBox="0 0 1000 700" width={1040} height={728} style={dead ? { filter: `drop-shadow(0 0 18px ${C.crimson})` } : undefined}>
          <Icon p={prog} f={f} />
        </svg>
      </div>
      <Kinetic text={p.labels[i]} f={f} at={a + 3} mode="rise" stagger={1} dur={8} y={760} size={40} spacing={0.3}
        color={i === 0 || i === 2 ? C.crimson : C.text} exit={b - 6} />
      <Meta corner="tr" opacity={0.6}>{`0${i + 1} / 05`}</Meta>
    </AbsoluteFill>
  );
};

/** 10–16.5 s: the five cards slam onto the wall (World), red thread ties them to the case; vacuum before the drop. */
export const Pinboard: React.FC = () => {
  const { f, dur } = useScene();
  const v = ramp(f, dur - 20, dur);
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 46%, rgba(0,0,0,0) ${30 - 18 * v}%, rgba(0,0,0,${0.25 + 0.6 * v}) 70%)` }} />;
};

/** 16.54 s drop: the title is stamped onto the case card (World), gold line + case number arrive on the beat. */
export const TitleCase: React.FC = () => {
  const { f, props: p, ev, scene } = useScene();
  const hit = ev("hit").f, sub = ev("sub").f, file = ev("file").f;
  const r = cardRect(card("case"), scene);
  return (
    <AbsoluteFill>
      <Burst f={f} at={hit} x={r.cx} y={r.cy - 40} n={36} r={620} dur={30} color={C.crimson} size={6} />
      <Kinetic text={p.sub} f={f} at={sub} mode="blur" stagger={2} dur={12} y={r.cy + r.h / 2 + 64} size={44} spacing={0.35} color={C.gold} gold={[p.sub]} />
      <Kinetic text={p.en} f={f} at={sub + 10} mode="rise" stagger={1} dur={10} y={r.cy + r.h / 2 + 130} size={22} spacing={0.8} latin weight={400} color={C.dim} />
      <Meta corner="tl" opacity={ramp(f, file, file + 15)}>{p.file}</Meta>
    </AbsoluteFill>
  );
};

/** Exhibit 1: three checkout lines seen from above. You switch lines; yours stalls. Only one lane is ever fastest. */
export const QueueExhibit: React.FC = () => {
  const { f, props: p, ev, scene } = useScene();
  const r = cardRect(card("queue"), scene);
  const flow = ev("flow").fs, sw = ev("switch").f, stall = ev("stall").f, scan = ev("scan").fs;
  const serve: number[][] = [[flow[0], flow[2], scan[1], scan[3]], [scan[2], scan[5]], [flow[1], flow[3]]];
  const fastest = [2, 0, 1, 0, 2, 1];
  const adv = (l: number) => serve[l].reduce((s, t) => s + easeInOutCubic(clamp((f - t) / 10)), 0);
  const x0 = r.cx - r.w * 0.36, gap = r.w * 0.13, regX = r.cx + r.w * 0.36;
  const ly = (l: number) => r.cy - r.h * 0.12 + l * r.h * 0.2;
  const slot = (l: number, j: number) => regX - gap * 0.9 - (j - adv(l)) * gap;
  const yk = ramp(f, sw, sw + 12, easeInOutCubic);
  const youX = lerp(slot(1, 5), slot(2, 6), yk), youY = lerp(ly(1), ly(2), yk) - 30 * Math.sin(Math.PI * yk);
  const si = lastIdx(f, scan);
  return (
    <CardSpace id="queue">
      {[0, 1, 2].map((l) => {
        const lit = si >= 0 && fastest[si] === l && f - scan[si] < 12;
        return (
          <div key={l}>
            <div style={{ position: "absolute", left: x0 - 20, top: ly(l) + 34, width: regX - x0, height: 2, background: C.line }} />
            <div style={{ position: "absolute", left: regX, top: ly(l) - 30, width: 54, height: 60, border: `2.5px solid ${lit ? C.gold : C.faint}`,
              boxShadow: lit ? `0 0 26px ${C.goldGlow}` : undefined }} />
            {Array.from({ length: 7 }, (_, j) => {
              const x = slot(l, j);
              if (x > regX - 20 || x < x0 - 10 || (l === 1 && j === 5 && f < sw + 6)) return null;
              const q = l === 2 && j === Math.ceil(adv(2)) && f >= stall && f < (scan[0] ?? stall + 40);
              return <div key={j} style={{ position: "absolute", left: x - 16, top: ly(l) - 16, width: 32, height: 32, borderRadius: "50%",
                border: `3px solid ${q ? C.crimson : C.text}`, opacity: clamp((x - x0) / 40) * 0.8 }} />;
            })}
          </div>
        );
      })}
      {f >= stall && f < (scan[0] ?? 1e9) && (
        <div style={{ position: "absolute", left: slot(2, Math.ceil(adv(2))) - 20, top: ly(2) - 92, fontFamily: FONT.en, fontSize: 56, color: C.crimson,
          transform: `scale(${1 + 0.3 * pulse(f, stall, 10)})` }}>?</div>
      )}
      <div style={{ position: "absolute", left: youX - 20, top: youY - 20, width: 40, height: 40, borderRadius: "50%", background: C.gold,
        boxShadow: `0 0 24px ${C.goldGlow}, 0 0 50px ${C.goldGlow}` }} />
      <div style={{ position: "absolute", left: youX - 40, top: youY - 76, width: 80, textAlign: "center", fontFamily: FONT.zh, fontSize: 32, color: C.gold }}>你</div>
      {si >= 2 && (
        <div style={{ position: "absolute", left: r.cx + r.w * 0.14, top: r.cy - r.h * 0.42, fontFamily: FONT.en, fontStyle: "italic", fontSize: 84, color: C.gold,
          opacity: ramp(f, scan[2], scan[2] + 8), textShadow: glowText(C.goldGlow, 0.5 + pulse(f, scan[2], 20)) }}>1/3</div>
      )}
    </CardSpace>
  );
};

/** Exhibit 2: the toast slides off, turns half a revolution (strobe), lands butter-down; 0.75 m vs 3 m. */
export const ToastExhibit: React.FC = () => {
  const { f, props: p, ev, scene } = useScene();
  const r = cardRect(card("toast"), scene);
  const slide = ev("slide").f, land = ev("land").f, tall = ev("tall").f;
  const tip = Math.round(lerp(slide, land, 0.4));
  const ox = r.cx - r.w * 0.42, oy = r.cy - r.h * 0.42, S = (r.w * 0.84) / 1000; // svg units → px
  const pos = (g: number) => { // g: 0..1 along slide + fall
    const s = clamp(g / 0.4), k = clamp((g - 0.4) / 0.6);
    return g < 0.4 ? { x: lerp(160, 360, easeInOutCubic(s)), y: 250, a: 0 } : { x: lerp(360, 470, k), y: lerp(250, 560, k * k), a: 180 * easeInOutCubic(k) };
  };
  const g = clamp((f - slide) / Math.max(1, land - slide));
  const toastAt = (q: { x: number; y: number; a: number }, op: number, key: number) => (
    <g key={key} transform={`translate(${q.x} ${q.y}) rotate(${q.a})`} opacity={op}>
      <rect x={-80} y={-14} width={160} height={28} rx={8} fill="none" stroke={C.text} strokeWidth={4} />
      <line x1={-70} x2={70} y1={-14} y2={-14} stroke={C.gold} strokeWidth={7} strokeLinecap="round" />
    </g>
  );
  const half = (t: number, H: number, turn: number, x: number, col: string) => {
    const k = ramp(f, t, t + 30);
    return (
      <g transform={`translate(${x} 0)`} opacity={k}>
        <line x1={0} x2={0} y1={600} y2={600 - H} stroke={col} strokeWidth={4} />
        <line x1={-30} x2={30} y1={600 - H} y2={600 - H} stroke={col} strokeWidth={4} />
        {toastAt({ x: 60, y: 600 - H * (1 - k), a: turn * easeInOutCubic(k) }, 1, 0)}
      </g>
    );
  };
  return (
    <CardSpace id="toast">
      <svg viewBox="0 0 1000 700" width={r.w * 0.84} height={r.h * 0.84} style={{ position: "absolute", left: ox, top: oy }}>
        <line x1={60} x2={380} y1={266} y2={266} stroke={C.text} strokeWidth={4} />
        <line x1={350} x2={350} y1={266} y2={600} stroke={C.text} strokeWidth={3} opacity={0.4} />
        <line x1={40} x2={640} y1={600} y2={600} stroke={C.text} strokeWidth={2} opacity={0.3} />
        {f >= land && [0.52, 0.66, 0.8, 0.92].map((q, i) => toastAt(pos(q), (0.12 + 0.06 * i) * ramp(f, land, land + 8), i))}
        {toastAt(pos(g), 1, 99)}
        {f >= land && <path d="M 400 600 A 70 70 0 0 1 540 600" fill="none" stroke={C.crimson} strokeWidth={3} opacity={ramp(f, land, land + 12)} />}
        {f >= tall && half(tall, 110, 180, 720, C.crimson)}
        {f >= tall && half(tall + 8, 430, 360, 880, C.gold)}
      </svg>
      {f >= tall && (
        <>
          <div style={{ position: "absolute", left: ox + 640 * S, top: oy + 610 * S, fontFamily: FONT.zh, fontSize: 26, color: C.crimson, opacity: ramp(f, tall + 10, tall + 25) }}>{p.aZh}</div>
          <div style={{ position: "absolute", left: ox + 780 * S, top: oy + 90 * S, fontFamily: FONT.zh, fontSize: 26, color: C.gold, opacity: ramp(f, tall + 18, tall + 33) }}>{p.bZh}</div>
        </>
      )}
      <Meta corner="tr" opacity={ramp(f, land, land + 20)}>{p.meta}</Meta>
    </CardSpace>
  );
};

/** Exhibit 3: a cord tumbling in a box, one beat per turn, ends up knotted. */
export const KnotExhibit: React.FC = () => {
  const { f, props: p, ev, scene } = useScene();
  const r = cardRect(card("knot"), scene);
  const sh = ev("shake").fs, kn = ev("knot").f;
  const i = lastIdx(f, sh);
  const turn = sh.reduce((s, t) => s + 90 * spring(f, t, 12, 0.3), 0);
  const prog = i < 0 ? 0 : clamp((i + clamp((f - sh[i]) / 15)) / sh.length) * 0.8 + 0.2 * ramp(f, kn - 4, kn + 6);
  const bw = r.h * 0.66;
  return (
    <CardSpace id="knot">
      <div style={{ position: "absolute", left: r.cx - bw / 2 + r.w * 0.1, top: r.cy - bw / 2 + 20, width: bw, height: bw, border: `3px solid ${C.text}`, borderRadius: 18,
        transform: `rotate(${turn}deg)`, opacity: 0.8 }}>
        <svg viewBox="80 0 840 700" width={bw} height={bw * 0.83} style={{ position: "absolute", left: 0, top: bw * 0.08, transform: `rotate(${-turn * 0.6}deg)` }}>
          {(() => { const K = ICONS.knot; return <K p={prog} f={f} />; })()}
        </svg>
      </div>
      <div style={{ position: "absolute", left: r.cx - r.w * 0.44, top: r.cy - 60, width: r.w * 0.3 }}>
        <div style={{ fontFamily: FONT.en, fontStyle: "italic", fontSize: 76, color: f >= kn ? C.gold : C.text, textShadow: f >= kn ? glowText(C.goldGlow, 0.5) : undefined }}>
          {f >= kn ? "≈ 50%" : `${Math.max(1, i + 1)}`}
        </div>
        <div style={{ fontFamily: FONT.zh, fontSize: 24, color: C.dim, marginTop: 8, letterSpacing: "0.1em", opacity: ramp(f, kn, kn + 15) }}>{p.stat}</div>
      </div>
      <Meta corner="tr" opacity={ramp(f, kn, kn + 20)}>{p.meta}</Meta>
    </CardSpace>
  );
};
