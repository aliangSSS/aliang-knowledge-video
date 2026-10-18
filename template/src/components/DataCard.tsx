import { C, FONT } from "../lib/theme";

/** Data card: thin border + a small colour-block icon, a title, a value and a tiny English line. */
export const DataCard: React.FC<{ x: number; y: number; w?: number; title: string; value?: string; en?: string; color?: string; opacity?: number }> = ({
  x, y, w = 380, title, value, en, color = C.gold, opacity = 1,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, padding: "22px 26px", border: `1px solid ${C.line}`, opacity, background: "rgba(5,9,16,0.35)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 12, height: 12, background: color }} />
      <div style={{ fontFamily: FONT.zh, fontWeight: 300, fontSize: 28, letterSpacing: "0.2em", color: C.text, opacity: 0.85 }}>{title}</div>
    </div>
    {value && <div style={{ fontFamily: FONT.en, fontSize: 64, color, marginTop: 14 }}>{value}</div>}
    {en && <div style={{ fontFamily: FONT.en, fontStyle: "italic", fontSize: 20, color: C.text, opacity: 0.45, marginTop: 6 }}>{en}</div>}
  </div>
);
