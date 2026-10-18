import { clamp, easeInOutCubic, easeOutCubic, hash, spring } from "../lib/anim";
import { TL } from "../lib/timeline";
import { C, FONT, glowText } from "../lib/theme";

export type KMode = "rise" | "blur" | "scale" | "drop" | "slam" | "type" | "scramble" | "wave" | "split";

/** Kinetic typography: every glyph animates on its own, staggered. Pick the mode that matches the topic's motion:
 * rise (calm) · blur (focus pull) · scale (pop) · drop (gravity, bounces) · slam (heavy, fast) · type (instant chars) ·
 * scramble (decoding / data) · wave (stays alive) · split (halves slide together).
 * Multi-line with "\n". `gold` = substrings in gold (with glow). `exit` = frame to start leaving (reverse). */
export const Kinetic: React.FC<{
  text: string;
  f: number;
  at: number;
  mode?: KMode;
  stagger?: number; // frames between glyphs
  dur?: number; // frames per glyph
  exit?: number;
  x?: number; // centre x (px)
  y: number; // centre y of the block (px)
  size?: number;
  spacing?: number; // em
  color?: string;
  gold?: string[];
  weight?: number;
  latin?: boolean; // use the serif-italic latin face
  lineHeight?: number;
  align?: "center" | "left";
  opacity?: number;
}> = ({ text, f, at, mode = "rise", stagger = 2, dur = 14, exit, x = 960, y, size = 80, spacing = 0.12, color = C.text, gold = [],
  weight = 300, latin = false, lineHeight = 1.35, align = "center", opacity = 1 }) => {
  const lines = text.split("\n");
  const goldIdx = new Set<number>();
  let flat = text.replace(/\n/g, "");
  for (const g of gold) for (let p = flat.indexOf(g); p >= 0; p = flat.indexOf(g, p + 1)) for (let j = 0; j < g.length; j++) goldIdx.add(p + j);
  const pool = (TL.glyphs || "01").replace(/\s/g, "");
  let n = 0;
  const blockH = lines.length * size * lineHeight;
  return (
    <div style={{ position: "absolute", left: align === "center" ? x - 960 : x, top: y - blockH / 2, width: align === "center" ? 1920 : undefined,
      textAlign: align, fontFamily: latin ? FONT.en : FONT.zh, fontStyle: latin ? "italic" : undefined, fontWeight: weight, fontSize: size,
      lineHeight, letterSpacing: `${spacing}em`, opacity }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ paddingLeft: align === "center" ? `${spacing}em` : 0, whiteSpace: "pre" }}>
          {[...ln].map((ch, ci) => {
            const i = n++;
            const st = at + i * stagger;
            let k = clamp((f - st) / dur);
            if (exit !== undefined) k = Math.min(k, 1 - clamp((f - exit - i * stagger * 0.5) / (dur * 0.7)));
            const g = goldIdx.has(i);
            let o = 1, tf = "", fl: string | undefined, c = ch;
            if (mode === "rise") { const e = easeOutCubic(k); o = e; tf = `translateY(${(1 - e) * 0.35 * size}px)`; }
            else if (mode === "blur") { const e = easeInOutCubic(k); o = e; fl = `blur(${((1 - e) * 12).toFixed(1)}px)`; }
            else if (mode === "scale") { const s = spring(f, st, dur, 0.4); o = clamp(k * 3); tf = `scale(${Math.max(0, s)})`; }
            else if (mode === "drop") { const s = spring(f, st, dur, 0.55); o = clamp(k * 4); tf = `translateY(${(s - 1) * 1.2 * size}px)`; }
            else if (mode === "slam") { const s = clamp((f - st) / Math.max(2, dur * 0.35)); o = s; tf = `scale(${2.2 - 1.2 * easeOutCubic(s)})`; }
            else if (mode === "type") { o = f >= st ? 1 : 0; }
            else if (mode === "scramble") { o = k > 0 ? 1 : 0; if (k > 0 && k < 1 && ch.trim()) c = pool[Math.floor(hash(i, Math.floor(f / 2)) * pool.length)]; }
            else if (mode === "wave") { const e = easeOutCubic(k); o = e; tf = `translateY(${((1 - e) * 0.4 + 0.05 * Math.sin((f - i * 4) / 9)) * size}px)`; }
            else if (mode === "split") { const e = easeOutCubic(k); o = e; tf = `translateX(${(1 - e) * (i % 2 ? 1 : -1) * 0.8 * size}px)`; }
            return (
              <span key={ci} style={{ display: "inline-block", opacity: o, transform: tf, filter: fl, color: g ? C.gold : color,
                textShadow: g && o > 0 ? glowText(C.goldGlow, 0.6 * o) : undefined }}>
                {c === " " ? " " : c}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
