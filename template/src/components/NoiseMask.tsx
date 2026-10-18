import { hash } from "../lib/anim";
import { C, FONT, MAIN_Y, SIZE } from "../lib/theme";

/** Text being eaten by noise: crimson squares cover more cells as `amount` goes 0 → 1. */
export const NoiseMask: React.FC<{ text: string; amount: number; y?: number; size?: number; seed?: number; color?: string }> = ({
  text, amount, y = MAIN_Y, size = SIZE.main, seed = 5, color = C.text,
}) => {
  const chars = [...text];
  const cell = size / 4;
  return (
    <div style={{ position: "absolute", top: y - size * 0.6, width: "100%", display: "flex", justifyContent: "center" }}>
      {chars.map((ch, i) => (
        <span key={i} style={{ position: "relative", display: "inline-block", width: size * 1.3, textAlign: "center", fontFamily: FONT.zh, fontWeight: 300, fontSize: size, lineHeight: 1.2, color }}>
          {ch}
          {Array.from({ length: 16 }, (_, j) => {
            const h = hash(i, j, seed);
            if (h > amount) return null;
            return (
              <span key={j} style={{
                position: "absolute", left: (j % 4) * cell * 1.3 + 2, top: Math.floor(j / 4) * cell * 1.2 + 4, width: cell * 1.3 - 4,
                height: cell * 1.2 - 4, background: h < amount * 0.5 ? C.crimson : C.crimsonMask,
              }} />
            );
          })}
        </span>
      ))}
    </div>
  );
};
