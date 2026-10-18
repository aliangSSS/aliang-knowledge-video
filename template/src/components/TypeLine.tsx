import { easeOutCubic, ramp } from "../lib/anim";
import { C, FONT, MAIN_Y, SIZE, glowText } from "../lib/theme";

/** Characters fade in one by one at `frames[i]` (scene-local, beat-locked — usually ev("type").fs).
 * A blinking gold underline cursor sits after the last visible char, waiting for the viewer to guess.
 * `slot` replaces the cursor (e.g. a rolling candidate / the answer). */
export const TypeLine: React.FC<{
  text: string;
  frames: number[];
  f: number;
  y?: number;
  size?: number;
  color?: string;
  highlight?: number[]; // char indices drawn in gold
  cursor?: boolean;
  slot?: React.ReactNode;
  opacity?: number;
}> = ({ text, frames, f, y = MAIN_Y, size = SIZE.main, color = C.text, highlight = [], cursor = true, slot, opacity = 1 }) => {
  const chars = [...text];
  const at = (i: number) => frames[i] ?? (frames.length ? frames[frames.length - 1] + (i - frames.length + 1) * 6 : 0);
  const shown = chars.filter((_, i) => f >= at(i)).length;
  const blink = Math.floor(f / 15) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute", top: y - size * 0.6, width: "100%", display: "flex", justifyContent: "center",
        alignItems: "flex-end", fontFamily: FONT.zh, fontWeight: 300, fontSize: size, lineHeight: 1.2, opacity,
      }}
    >
      {chars.map((ch, i) => {
        const k = ramp(f, at(i), at(i) + 5, easeOutCubic);
        const gold = highlight.includes(i);
        return (
          <span
            key={i}
            style={{
              color: gold ? C.gold : color, opacity: k, transform: `translateY(${(1 - k) * 8}px)`, display: "inline-block",
              marginRight: "0.3em", textShadow: gold ? glowText() : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
      {slot ?? (cursor && shown === chars.length && (
        <span
          style={{
            display: "inline-block", width: size * 0.9, height: 4, marginBottom: size * 0.12, background: C.gold,
            boxShadow: `0 0 12px ${C.goldGlow}, 0 0 28px ${C.goldGlow}`, opacity: blink ? 1 : 0.15,
          }}
        />
      ))}
    </div>
  );
};
