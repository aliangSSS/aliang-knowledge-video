import { C, FONT, H, W } from "../lib/theme";

export type Range = [number, number];

const nice = (x: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9))));
  for (const m of [1, 2, 5, 10]) if (m * p >= x) return m * p;
  return 10 * p;
};

/** Ruler-style number line: fine ticks + serif numbers. Gold band = "still possible", crimson blocks = excluded.
 * `view` is the visible value window — animate it to zoom into the remaining range. */
export const NumberLine: React.FC<{
  y: number;
  view: Range;
  minStep?: number;
  gold?: Range | null;
  masks?: { r: Range; a: number }[];
  marker?: { v: number; a: number; color?: string };
  x0?: number;
  x1?: number;
  opacity?: number;
  fmt?: (v: number) => string;
}> = ({ y, view, minStep = 1, gold, masks = [], marker, x0 = 200, x1 = W - 200, opacity = 1, fmt = (v) => String(Math.round(v)) }) => {
  const span = view[1] - view[0];
  const X = (v: number) => x0 + ((v - view[0]) / span) * (x1 - x0);
  const cx = (v: number) => Math.min(x1, Math.max(x0, X(v)));
  const minor = Math.max(minStep, nice(span / 100));
  const major = Math.max(minor, nice(span / 8));
  const ticks: React.ReactNode[] = [];
  for (let v = Math.ceil(view[0] / minor) * minor, n = 0; v <= view[1] + 1e-9 && n < 400; v += minor, n++) {
    const isMaj = Math.abs(v / major - Math.round(v / major)) < 1e-6;
    ticks.push(<line key={n} x1={X(v)} x2={X(v)} y1={y} y2={y + (isMaj ? 18 : 8)} stroke={C.text} strokeOpacity={isMaj ? 0.5 : 0.22} />);
    if (isMaj)
      ticks.push(
        <text key={`t${n}`} x={X(v)} y={y + 52} fill={C.text} fillOpacity={0.55} fontFamily={FONT.en} fontSize={24} textAnchor="middle">
          {fmt(v)}
        </text>,
      );
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke={C.text} strokeOpacity={0.4} />
      {ticks}
      {masks.map((m, i) => (
        <rect key={i} x={cx(m.r[0])} y={y - 64} width={Math.max(0, cx(m.r[1]) - cx(m.r[0]))} height={64} fill={C.crimsonMask} opacity={m.a} />
      ))}
      {gold && (
        <rect x={cx(gold[0])} y={y - 3} width={Math.max(0, cx(gold[1]) - cx(gold[0]))} height={6} fill={C.gold}
          style={{ filter: `drop-shadow(0 0 8px ${C.goldGlow})` }} />
      )}
      {marker && marker.a > 0 && (
        <circle cx={cx(marker.v)} cy={y} r={7} fill={marker.color ?? C.gold} opacity={marker.a} style={{ filter: `drop-shadow(0 0 10px ${C.goldGlow})` }} />
      )}
    </svg>
  );
};
