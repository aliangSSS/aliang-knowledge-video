import { clamp, easeInOutCubic, hash, lerp } from "./lib/anim";
import { smooth } from "./components";
import { C } from "./lib/theme";

/** Line-art drawings of the five everyday mishaps, in a 1000×700 box. p = 0..1 animates the mishap
 * (used full-screen in the montage); p = 1 is the still that sits on the evidence wall. */
const L = { fill: "none", stroke: C.text, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Battery: React.FC<{ p: number }> = ({ p }) => {
  const lv = lerp(0.62, 0.02, easeInOutCubic(clamp(p * 1.25)));
  const red = lv < 0.12;
  return (
    <g>
      <rect x={250} y={230} width={460} height={240} rx={26} {...L} />
      <rect x={714} y={305} width={36} height={90} rx={8} {...L} />
      <rect x={274} y={254} width={Math.max(8, 412 * lv)} height={192} rx={12} fill={red ? C.crimson : C.text} opacity={red ? 0.9 : 0.55} />
      <text x={500} y={590} textAnchor="middle" fontFamily="Lora, serif" fontSize={110} fill={red ? C.crimson : C.text}>{Math.max(1, Math.round(lv * 100))}%</text>
    </g>
  );
};

export const Queue: React.FC<{ p: number; you?: boolean }> = ({ p, you = true }) => (
  <g>
    {[0, 1, 2].map((l) => {
      const y = 170 + l * 180, move = l === 1 ? 0 : (l === 0 ? 1.4 : 0.8) * p * 120;
      return (
        <g key={l}>
          <line x1={120} x2={840} y1={y + 55} y2={y + 55} {...L} strokeWidth={3} opacity={0.35} />
          <rect x={850} y={y - 35} width={70} height={70} rx={8} {...L} strokeWidth={4} />
          {[0, 1, 2, 3, 4].map((j) => {
            const x = 760 - j * 130 + (l === 1 ? 0 : move % 130);
            const isYou = you && l === 1 && j === 3;
            return <circle key={j} cx={x} cy={y} r={isYou ? 26 : 22} fill={isYou ? C.gold : "none"} stroke={isYou ? C.gold : C.text} strokeWidth={5}
              opacity={x < 140 || x > 820 ? 0 : 1} style={isYou ? { filter: `drop-shadow(0 0 12px ${C.goldGlow})` } : undefined} />;
          })}
        </g>
      );
    })}
  </g>
);

/** Toast sliding off a table edge, half a turn, butter (gold edge) down. */
export const Toast: React.FC<{ p: number }> = ({ p }) => {
  const s = clamp(p / 0.35), k = clamp((p - 0.35) / 0.55);
  const x = p < 0.35 ? lerp(380, 600, easeInOutCubic(s)) : lerp(600, 720, k);
  const y = p < 0.35 ? 300 : lerp(300, 600, k * k);
  const r = p < 0.35 ? 0 : 180 * easeInOutCubic(k);
  return (
    <g>
      <line x1={120} x2={600} y1={322} y2={322} {...L} />
      <line x1={560} x2={560} y1={322} y2={640} {...L} strokeWidth={4} opacity={0.5} />
      <line x1={120} x2={900} y1={640} y2={640} {...L} strokeWidth={3} opacity={0.35} />
      <g transform={`translate(${x} ${y}) rotate(${r})`}>
        <rect x={-110} y={-18} width={220} height={36} rx={10} {...L} strokeWidth={5} />
        <line x1={-96} x2={96} y1={-18} y2={-18} stroke={C.gold} strokeWidth={9} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${C.goldGlow})` }} />
      </g>
    </g>
  );
};

/** A door closes behind you; the umbrella is still inside; rain starts. */
export const Umbrella: React.FC<{ p: number; f?: number }> = ({ p, f = 0 }) => {
  const door = clamp(p / 0.3);
  return (
    <g>
      <rect x={180} y={120} width={240} height={480} {...L} strokeWidth={4} opacity={0.6} />
      <line x1={180} y1={120} x2={180 + 240 * (1 - 0.85 * (1 - door))} y2={120 + 30 * (1 - door)} {...L} />
      <path d="M 260 360 q 40 -70 80 0 M 300 360 v 120 q 0 20 -18 18" {...L} strokeWidth={5} opacity={0.75} />
      <circle cx={640} cy={330} r={34} {...L} strokeWidth={5} />
      <path d="M 640 364 v 140 M 640 410 l -50 50 M 640 410 l 50 50 M 640 504 l -40 90 M 640 504 l 40 90" {...L} strokeWidth={5} />
      {p > 0.35 && Array.from({ length: 34 }, (_, i) => {
        const x = 470 + hash(i, 1) * 480, y0 = ((hash(i, 2) * 700 + (f * 22 + i * 37)) % 700);
        return <line key={i} x1={x} x2={x - 12} y1={y0} y2={y0 + 46} stroke={C.text} strokeWidth={3} opacity={0.55 * clamp((p - 0.35) * 4)} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** An earphone cord: straight → tangled. */
export const Knot: React.FC<{ p: number; f?: number }> = ({ p, f = 0 }) => {
  const k = easeInOutCubic(clamp(p));
  const pts: [number, number][] = Array.from({ length: 22 }, (_, i) => {
    const u = i / 21, a = u * Math.PI * 6.2 + hash(i, 3) * 1.2;
    const tx = 500 + Math.cos(a) * (190 + 130 * hash(i, 4)) * (0.6 + 0.4 * Math.sin(u * 3)), ty = 350 + Math.sin(a) * (150 + 90 * hash(i, 5));
    const wob = (1 - k) * 0 + k * 6 * Math.sin(f / 5 + i);
    return [lerp(140 + u * 720, tx, k) + wob, lerp(350 + 30 * Math.sin(u * 9 + f / 6) * (1 - k) * clamp(p * 4), ty, k)];
  });
  return (
    <g>
      <path d={smooth(pts)} {...L} strokeWidth={6} />
      <rect x={pts[0][0] - 40} y={pts[0][1] - 16} width={44} height={32} rx={8} {...L} strokeWidth={4} />
      <circle cx={pts[21][0] + 18} cy={pts[21][1]} r={20} {...L} strokeWidth={4} />
    </g>
  );
};

export const ICONS: Record<string, React.FC<{ p: number; f?: number }>> = { battery: Battery, queue: Queue, toast: Toast, umbrella: Umbrella, knot: Knot };
