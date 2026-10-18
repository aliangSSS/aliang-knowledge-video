import { useCurrentFrame } from "remotion";
import { DrawPath, Stamp } from "./components";
import { ICONS } from "./Icons";
import { BOARD, CARDS, Card, boardOpacity, card, edge, evAbs, live, scene, tiltOf } from "./board";
import { fall, pulse, ramp } from "./lib/anim";
import { C, FONT } from "./lib/theme";

const FALLERS = ["queue", "toast", "knot", "umbrella", "battery"];
const Pin: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 11 }) => (
  <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%",
    background: `radial-gradient(circle at 35% 35%, #ff8aa0, ${C.crimson} 55%, #4a1020)`, boxShadow: "0 3px 6px rgba(0,0,0,0.6)" }} />
);

/** The evidence wall: cards, pins, red thread, stamps. Scenes zoom into a card and play its live version on top. */
export const World: React.FC = () => {
  const F = useCurrentFrame();
  const op = boardOpacity(F);
  if (op <= 0.001) return null;
  const drop = scene("pinboard");
  const dropFs = drop ? drop.events.drop.fs.map((f) => f + drop.from) : [];
  const thrFs = drop ? drop.events.threads.fs.map((f) => f + drop.from) : [];
  const caseHit = evAbs("title", "hit");
  const tags = scene("fixes");
  const tagFs = tags ? tags.events.tags.fs.map((f) => f + tags.from) : [];
  const goldFs = tags ? tags.events.gold.fs.map((f) => f + tags.from) : [];
  const caseC = card("case"), sus = card("suspect"), cal = card("calendar");

  const cardEl = (c: Card) => {
    const fi = FALLERS.indexOf(c.id);
    const t0 = fi >= 0 ? dropFs[fi] ?? 0 : drop?.from ?? 0;
    if (F < t0 - 14) return null;
    const dy = fi >= 0 ? (1 - fall(F, t0 - 14, t0, 2, 0.25)) * -900 : 0;
    const tilt = tiltOf(c) + (fi >= 0 ? 4 * pulse(F, t0, 14) * Math.sin((F - t0) / 2) : 0);
    const appear = fi >= 0 ? 1 : ramp(F, t0, t0 + 20);
    const thumb = 1 - live(c, F);
    const Icon = ICONS[c.id];
    const vs = scene(c.scene ?? "");
    const vf = vs?.events.verdict ? vs.from + vs.events.verdict.f : null;
    const st = c.stamp ?? [0.7, 0.8];
    return (
      <div key={c.id} style={{ position: "absolute", left: c.x - c.w / 2, top: c.y - c.h / 2 + dy, width: c.w, height: c.h, opacity: appear,
        transform: `rotate(${tilt.toFixed(2)}deg)`, background: "linear-gradient(160deg, #1d1b19, #141312)", border: "1.5px solid rgba(237,237,233,0.16)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.55)" }}>
        {Icon && (
          <svg viewBox="0 0 1000 700" width={c.w * 0.8} height={c.h * 0.66} style={{ position: "absolute", left: c.w * 0.1, top: c.h * 0.2, opacity: thumb * 0.85 }}>
            <Icon p={1} f={0} />
          </svg>
        )}
        {c.id === "case" && (caseHit === null || F < caseHit) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.zh, fontSize: 170, color: C.text, opacity: 0.45 }}>？</div>
        )}
        {c.id === "case" && caseHit !== null && F >= caseHit && (
          <div style={{ position: "absolute", right: 22, top: 14, fontFamily: FONT.en, fontSize: 22, letterSpacing: "0.3em", color: C.dim }}>No.1949</div>
        )}
        {c.id === "suspect" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.zh, fontWeight: 300,
            fontSize: 46, letterSpacing: "0.3em", paddingLeft: "0.3em", color: C.text, opacity: 0.85 }}>被告：宇宙</div>
        )}
        {c.id === "calendar" && <Calendar c={c} F={F} />}
        <div style={{ position: "absolute", left: 22, top: 14, fontFamily: FONT.zh, fontWeight: 300, fontSize: 24, letterSpacing: "0.2em", color: C.dim }}>{c.label}</div>
        <Pin x={c.w / 2} y={18} />
        {vf !== null && vs && <Stamp f={F} at={vf} x={c.w * st[0]} y={c.h * st[1]} text={vs.props.stamp} sub={vs.props.why} size={40} rot={-9} seed={fi + 2} />}
      </div>
    );
  };

  const thread = (a: Card, b: Card, at: number, gold?: number, key?: string) => {
    const p = edge(a, b.x, b.y), q = edge(b, a.x, a.y);
    return (
      <div key={key}>
        <DrawPath pts={[p, q]} f={F} at={at} dur={10} color={C.crimson} width={3} sag={40} head={false} glow={false} />
        {gold !== undefined && <DrawPath pts={[p, q]} f={F} at={gold} dur={12} color={C.gold} width={3.5} sag={40} />}
        {F >= at && <Pin x={p[0]} y={p[1]} r={8} />}
        {F >= at + 10 && <Pin x={q[0]} y={q[1]} r={8} />}
      </div>
    );
  };
  const vh = evAbs("verdict", "hit"), mt = evAbs("memory", "thread");
  const vsc = scene("verdict");
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: op }}>
      <div style={{ position: "absolute", left: BOARD.x0, top: BOARD.y0, width: BOARD.x1 - BOARD.x0, height: BOARD.y1 - BOARD.y0,
        background: "radial-gradient(ellipse 60% 55% at 50% 42%, #2a2420 0%, #17130f 55%, #0b0907 100%)" }} />
      {CARDS.map(cardEl)}
      {FALLERS.map((id, i) => thrFs[i] !== undefined && thread(card(id), caseC, thrFs[i], goldFs[i], id))}
      {mt !== null && thread(cal, sus, mt, undefined, "cal")}
      {caseHit !== null && <Stamp f={F} at={caseHit} x={caseC.x} y={caseC.y + 10} text={scene("title")!.props.title} size={92} rot={-6} seed={11} />}
      {vh !== null && vsc && <Stamp f={F} at={vh} x={sus.x + 120} y={sus.y + 34} text={vsc.props.stamp} sub={vsc.props.en} size={50} rot={-12} seed={13} />}
      {tags?.props.tags.map((tg: { card: string; zh: string }, i: number) => {
        const c = card(tg.card), t = tagFs[i];
        if (t === undefined || F < t - 2) return null;
        const k = ramp(F, t - 2, t + 6), gk = goldFs[i] !== undefined ? ramp(F, goldFs[i], goldFs[i] + 8) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: c.x - c.w / 2 + 30, top: c.y + c.h / 2 + 18 - 30 * (1 - k), opacity: k, whiteSpace: "nowrap",
            padding: "10px 26px", border: `3px solid ${C.gold}`, background: `rgba(246,211,146,${0.08 + 0.2 * gk})`, fontFamily: FONT.zh,
            fontSize: 40, letterSpacing: "0.15em", color: C.gold, boxShadow: gk ? `0 0 ${30 * gk}px ${C.goldGlow}` : undefined }}>✓ {tg.zh}</div>
        );
      })}
    </div>
  );
};

/** 30 days; three bad ones turn crimson once the memory scene has shown them. */
const Calendar: React.FC<{ c: Card; F: number }> = ({ c, F }) => {
  const m = scene("memory");
  const bad: number[] = m?.props.bad ?? [];
  const bf = m ? m.events.bad.fs.map((f) => f + m.from) : [];
  const cw = (c.w - 120) / 6, ch = (c.h - 120) / 5;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - live(c, F) }}>
      {Array.from({ length: 30 }, (_, d) => {
        const bi = bad.indexOf(d), on = bi >= 0 && bf[bi] !== undefined && F >= bf[bi];
        return <div key={d} style={{ position: "absolute", left: 60 + (d % 6) * cw + 6, top: 60 + Math.floor(d / 6) * ch + 6, width: cw - 12, height: ch - 12,
          border: `1.5px solid ${on ? C.crimson : "rgba(237,237,233,0.2)"}`, background: on ? "rgba(165,58,91,0.45)" : "transparent" }} />;
      })}
    </div>
  );
};
