import { C, FONT, MAIN_Y, glowText } from "../lib/theme";
import { Label } from "./Meta";

/** Minimal markup: x_{i} → subscript, 2^{n} → superscript, everything else verbatim. */
export const parseTex = (s: string) => {
  const out: React.ReactNode[] = [];
  const re = /([_^])\{([^}]*)\}/g;
  let last = 0, k = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(m[1] === "_" ? <sub key={k++} style={{ fontSize: "0.55em" }}>{m[2]}</sub> : <sup key={k++} style={{ fontSize: "0.55em" }}>{m[2]}</sup>);
    last = re.lastIndex;
  }
  out.push(s.slice(last));
  return out;
};

/** Serif-italic formula / number with a small bilingual label underneath ("复利 · COMPOUND INTEREST"). */
export const FormulaCard: React.FC<{
  tex: string;
  zh?: string;
  en?: string;
  y?: number;
  size?: number;
  color?: string;
  glow?: number; // 0 = none
  opacity?: number;
  labelOpacity?: number;
  style?: React.CSSProperties;
}> = ({ tex, zh, en, y = MAIN_Y, size = 96, color = C.gold, glow = 0.7, opacity = 1, labelOpacity = 1, style }) => (
  <div style={{ position: "absolute", top: y - size * 0.7, width: "100%", textAlign: "center", opacity }}>
    <div style={{ fontFamily: FONT.en, fontStyle: "italic", fontSize: size, color, letterSpacing: "0.04em", textShadow: glow ? glowText(C.goldGlow, glow) : undefined, ...style }}>
      {parseTex(tex)}
    </div>
    {(zh || en) && (
      <div style={{ marginTop: size * 0.35 }}>
        <Label zh={zh} en={en} opacity={labelOpacity} />
      </div>
    )}
  </div>
);
