import { AbsoluteFill } from "remotion";
import { Burst, Counter, DrawPath, Kinetic, Meta, Stamp } from "../components";
import { card, cardRect } from "../board";
import { clamp, easeInOutCubic, easeOutCubic, hash, lastIdx, lerp, pulse, ramp } from "../lib/anim";
import { useScene } from "../lib/timeline";
import { C, FONT, glowText } from "../lib/theme";

const BP = "#6fb3c9"; // blueprint cyan (stays within the cold structural family)

/** 1949 case file: a folder opens on a blueprint of the rocket sled; the strain-gauge bridge has one leg wired
 * backwards (crimson); the meter sits at 0; countdown 3·2·1 into the third drop. */
export const Archive: React.FC = () => {
  const { f, props: p, ev, dur } = useScene();
  const open = ev("open").f, draw = ev("draw").f, zero = ev("zero").fs, wire = ev("wire").f, cnt = ev("count").fs;
  const ok = easeInOutCubic(clamp((f - open) / 16));
  const dk = cnt.length ? ramp(f, cnt[cnt.length - 1] + 6, dur - 2) : 0;
  const L = { fill: "none", stroke: BP, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const d = (a: number) => ramp(f, draw + a, draw + a + 40);
  const zi = lastIdx(f, zero);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - 0.85 * dk }}>
        <div style={{ position: "absolute", left: 260, top: 110, width: 1400, height: 660, background: "linear-gradient(180deg, #0c1a24, #08121a)",
          border: "2px solid rgba(111,179,201,0.35)", backgroundImage: "linear-gradient(rgba(111,179,201,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(111,179,201,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px", boxShadow: "0 30px 80px rgba(0,0,0,0.7)" }}>
          <svg width={1400} height={660} style={{ position: "absolute", inset: 0 }}>
            <line x1={60} x2={1340} y1={250} y2={250} {...L} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - d(0)} />
            <line x1={60} x2={1340} y1={262} y2={262} {...L} strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - d(0)} />
            <g opacity={d(10)}>
              <path d="M 520 246 L 560 160 L 780 160 L 830 246 Z" {...L} />
              <path d="M 610 160 v -40 q 0 -14 14 -14 h 40 M 640 106 a 22 22 0 1 0 0.1 0 M 640 128 l 30 32" {...L} />
              <rect x={830} y={170} width={150} height={56} rx={10} {...L} />
              <path d="M 980 182 l 40 -10 v 52 l -40 -10" {...L} />
            </g>
            <g transform="translate(150 360)" opacity={d(20)}>
              <path d="M 120 0 L 240 120 L 120 240 L 0 120 Z" {...L} />
              {[[60, 60], [180, 60], [180, 180], [60, 180]].map(([x, y], i) => <rect key={i} x={x - 18} y={y - 8} width={36} height={16} fill="#08121a" stroke={i === 2 && f >= wire ? C.crimson : BP} strokeWidth={3} transform={`rotate(${i % 2 ? -45 : 45} ${x} ${y})`} />)}
              <line x1={0} x2={240} y1={120} y2={120} {...L} strokeDasharray="6 8" />
              <circle cx={120} cy={120} r={22} {...L} />
              {f >= wire && <path d="M 160 160 l 40 40 M 200 160 l -40 40" stroke={C.crimson} strokeWidth={6} strokeLinecap="round" opacity={0.6 + 0.4 * Math.abs(Math.sin((f - wire) / 5))} />}
            </g>
            <g transform="translate(900 360)" opacity={d(30)}>
              <path d="M 0 220 A 200 200 0 0 1 400 220" {...L} />
              {Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (1 - i / 10); return <line key={i} x1={200 + Math.cos(a) * 180} y1={220 - Math.sin(a) * 180} x2={200 + Math.cos(a) * 200} y2={220 - Math.sin(a) * 200} {...L} strokeWidth={2} />; })}
              <line x1={200} y1={220} x2={200 - 170 + 6 * Math.sin(f / 3) * (zi >= 0 ? 1 : 0)} y2={214} stroke={C.crimson} strokeWidth={5} strokeLinecap="round" />
            </g>
          </svg>
          {zi >= 0 && (
            <div style={{ position: "absolute", left: 1040, top: 470, width: 120, textAlign: "center", fontFamily: FONT.en, fontSize: 110, color: C.crimson,
              transform: `scale(${1 + 0.15 * pulse(f, zero[zi], 10)})` }}>0</div>
          )}
          <div style={{ position: "absolute", left: 40, top: 30, fontFamily: FONT.zh, fontSize: 30, letterSpacing: "0.3em", color: BP, opacity: d(0) }}>{p.label}</div>
        </div>
        <div style={{ position: "absolute", left: 260, top: 110, width: 1400, height: 660, transformOrigin: "0 50%", transform: `perspective(2400px) rotateY(${-170 * ok}deg)`,
          background: "linear-gradient(160deg, #3b3226, #231d16)", border: "2px solid rgba(237,237,233,0.2)", backfaceVisibility: "hidden", opacity: ok < 0.98 ? 1 : 0 }}>
          <div style={{ position: "absolute", left: 80, top: 80, fontFamily: FONT.zh, fontSize: 64, letterSpacing: "0.2em", color: "rgba(237,237,233,0.7)" }}>{p.file}</div>
          <div style={{ position: "absolute", right: 80, bottom: 70, padding: "10px 24px", border: `4px solid ${C.crimson}`, color: C.crimson, fontFamily: FONT.zh, fontSize: 40, transform: "rotate(-8deg)" }}>绝密</div>
        </div>
      </AbsoluteFill>
      {cnt.map((t, i) => f >= t && f < (cnt[i + 1] ?? t + 18) && (
        <div key={i} style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT.en, fontSize: 320, color: i === 2 ? C.crimson : C.text,
          opacity: 1 - ramp(f, t + 10, t + 16), transform: `scale(${1.6 - 0.6 * easeOutCubic(clamp((f - t) / 5))})` }}>{p.count[i]}</div>
      ))}
      <Meta corner="tl" opacity={ramp(f, open, open + 20) * (1 - dk)}>{p.file}</Meta>
    </AbsoluteFill>
  );
};

/** 116.64 s drop, the film's only full colour: desert dawn, the sled fires, rails blur past, 0 → 1017 km/h, brake, 46.2 g. */
export const Launch: React.FC = () => {
  const { f, props: p, ev, dur } = useScene();
  const hit = ev("hit").f, br = ev("brake").f;
  const T = br - hit, A = 2 * 4200 / (T * T); // px/frame² so the sled covers ~4200 px of rail-scroll by the brake
  const X = f < hit ? 0 : f < br ? 0.5 * A * (f - hit) ** 2 : 0.5 * A * T * T + A * T * 8 * (1 - Math.exp(-(f - br) / 8));
  const v = f < hit ? 0 : f < br ? (f - hit) / T : Math.exp(-(f - br) / 8);
  const push = 1 + 0.14 * ramp(f, br, dur, easeInOutCubic); // after the stop: a slow push into the sunrise
  const end = 1 - 0.55 * ramp(f, dur - 30, dur);
  const sx = 700, sy = 790, HZ = 700; // horizon high, so the sled and its plume sit on dark ground
  return (
    <AbsoluteFill style={{ opacity: end }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "1500px 600px" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #1a1342 0%, #4a1d6b 20%, #b2306c 40%, #f06a3c 56%, #ffc76b 64.6%, #2a140e 64.9%, #0c0706 100%)" }} />
        <div style={{ position: "absolute", left: 1200, top: HZ - 40 - 70 * ramp(f, 0, dur, easeInOutCubic), width: 900, height: 900, borderRadius: "50%", transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(255,240,190,1) 0%, rgba(255,190,110,0.6) 12%, rgba(255,140,80,0) 50%)", mixBlendMode: "screen" }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <path d={`M0,${HZ} ${Array.from({ length: 25 }, (_, i) => `L${i * 80},${HZ - (40 + 90 * hash(i, 4)) * (1 - Math.exp(-Math.pow((i * 80 - 1200) / 300, 2)))}`).join(" ")} L1920,${HZ} Z`} fill="#3a1638" />
          <line x1={0} x2={1920} y1={sy + 30} y2={sy + 30} stroke="#ffd79a" strokeWidth={4} style={{ filter: "drop-shadow(0 0 6px #ffb560)" }} />
          {Array.from({ length: 26 }, (_, i) => { const x = (((i * 80 - X) % 2080) + 2080) % 2080 - 80; return <line key={i} x1={x} x2={x - 24} y1={sy + 34} y2={sy + 52} stroke="#a0644a" strokeWidth={6} />; })}
          {v > 0.05 && Array.from({ length: 22 }, (_, i) => { const y = 720 + hash(i, 2) * 300, x = (((hash(i, 3) * 1920 - X * 1.6) % 1920) + 1920) % 1920; return <line key={i} x1={x} x2={x + 260 * v} y1={y} y2={y} stroke="#fff3dd" strokeWidth={2} opacity={0.4 * v} />; })}
        </svg>
        {f >= hit && (
          <div style={{ position: "absolute", left: 0, top: 0, opacity: f < br ? 1 : Math.exp(-(f - br) / 6) }}>
            <div style={{ position: "absolute", left: sx - 150 - 1100 * (0.45 + 0.55 * v), top: sy - 70 + 5 * Math.sin(f), width: 1100 * (0.45 + 0.55 * v), height: 140, borderRadius: "50%",
              background: "linear-gradient(90deg, rgba(255,90,30,0), rgba(255,140,50,0.75) 60%, rgba(255,220,150,0.95) 90%, #fffbea)", filter: "blur(10px)" }} />
            <div style={{ position: "absolute", left: sx - 150 - 500 * (0.45 + 0.55 * v), top: sy - 26 + 3 * Math.sin(f * 1.7), width: 500 * (0.45 + 0.55 * v), height: 52, borderRadius: "50%",
              background: "linear-gradient(90deg, rgba(255,255,255,0), #fff6dc 85%, #ffffff)", filter: "blur(3px)" }} />
          </div>
        )}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <g transform={`translate(${sx} ${sy}) scale(1.6) translate(${-sx} ${-sy})`}>
            <path d={`M ${sx - 120} ${sy + 18} L ${sx - 80} ${sy - 50} L ${sx + 150} ${sy - 50} L ${sx + 210} ${sy + 18} Z`} fill="#140a08" stroke="#ffcf8a" strokeWidth={2.5} />
            <path d={`M ${sx + 10} ${sy - 50} v -46 q 0 -14 14 -14 h 40 M ${sx + 42} ${sy - 150} a 22 22 0 1 0 0.1 0`} fill="#140a08" stroke="#ffcf8a" strokeWidth={2.5} />
          </g>
        </svg>
        <Burst f={f} at={hit} x={sx - 190} y={sy} n={50} r={520} dur={34} color="#ffb060" size={8} />
        <Burst f={f} at={br} x={sx + 340} y={sy} n={70} r={600} dur={40} color="#e8f4ff" size={7} up={200} seed={4} />
        {f >= br && Array.from({ length: 7 }, (_, i) => { // the brake's spray and dust drift off and thin out
          const q = f - br, k = clamp(q / 150), r = 70 + 34 * i + q * 1.5;
          return <div key={i} style={{ position: "absolute", left: sx + 300 + i * 80 + q * (1.1 + 0.35 * i) - r, top: sy - 30 - i * 20 - q * 0.4 - r, width: 2 * r, height: 2 * r,
            borderRadius: "50%", background: "radial-gradient(circle, rgba(255,222,184,0.32), rgba(255,180,120,0) 70%)", opacity: (1 - k) * 0.9 }} />;
        })}
        {Array.from({ length: 46 }, (_, i) => { // motes in the low sun, always moving
          const x = (hash(i, 7) * 1920 + f * (0.5 + hash(i, 8)) * (1 + 3 * v)) % 1920, y = 420 + hash(i, 9) * 380 + 12 * Math.sin(f / 40 + i);
          return <div key={`m${i}`} style={{ position: "absolute", left: x, top: y, width: 3, height: 3, borderRadius: "50%", background: "#ffe6c0", opacity: 0.18 + 0.2 * Math.sin(f / 25 + i) }} />;
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(2,2,2,0.85) 0%, rgba(2,2,2,0.5) 16%, rgba(2,2,2,0) 30%)" }} />
      {f >= hit && (
        <div style={{ position: "absolute", right: 140, top: 110, textAlign: "right" }}>
          <div style={{ position: "relative", width: 520, height: 150 }}>
            <Counter f={f} at={hit} dur={T} to={p.speed} x={260} y={75} size={140} fmt={(x) => Math.round(x).toLocaleString("en-US")} />
          </div>
          <div style={{ fontFamily: FONT.en, fontSize: 30, color: "#fff3dd", letterSpacing: "0.3em" }}>{p.unit}</div>
          {f >= br && <div style={{ fontFamily: FONT.en, fontStyle: "italic", fontSize: 90, color: "#fff3dd", marginTop: 20, textShadow: glowText("#ff8a5c", 0.8),
            transform: `scale(${1.4 - 0.4 * easeOutCubic(clamp((f - br) / 6))})`, transformOrigin: "right center" }}>{p.g}</div>}
        </div>
      )}
      <Meta corner="tl" color="rgba(255,240,220,0.8)">{p.meta}</Meta>
    </AbsoluteFill>
  );
};

/** Back on the wall: a fix is pinned under every card, the red thread turns gold (World). */
export const Fixes: React.FC = () => {
  const { f } = useScene();
  return <Meta corner="tl" opacity={ramp(f, 10, 30)}>整改清单 · CHECKLIST</Meta>;
};

/** Last chord: 结案 stamped on the case file; the title line in gold rides out with the music's tail. */
export const CaseClosed: React.FC = () => {
  const { f, props: p, ev, scene } = useScene();
  const r = cardRect(card("case"), scene);
  const st = ev("stamp").f, ln = ev("line").f;
  return (
    <AbsoluteFill>
      <Stamp f={f} at={st} x={r.cx + r.w * 0.3} y={r.cy + r.h * 0.3} text={p.stamp} size={96} rot={-14} seed={21} />
      <Kinetic text={p.line} f={f} at={ln} mode="blur" stagger={2} dur={12} y={r.cy + r.h / 2 + 70} size={44} spacing={0.35} color={C.gold} gold={[p.line]} />
      <Kinetic text={p.line2} f={f} at={ln + 10} mode="rise" stagger={2} dur={10} y={r.cy + r.h / 2 + 140} size={36} spacing={0.5} color={C.text} />
      <DrawPath pts={[[r.cx - 120, r.cy + r.h / 2 + 175], [r.cx + 120, r.cy + r.h / 2 + 175]]} f={f} at={ln + 30} dur={20} width={2} head={false} />
    </AbsoluteFill>
  );
};
