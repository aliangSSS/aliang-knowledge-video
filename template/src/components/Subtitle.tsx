import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeInOutCubic, ramp } from "../lib/anim";
import { FPS, TL } from "../lib/timeline";
import { C, FONT, H, SIZE } from "../lib/theme";

const FADE = Math.round(0.2 * FPS);

/** Global bilingual subtitles, bottom centre. Timing comes from build.py (reading pace, not the beat). */
export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const s = TL.subs.find((x) => f >= x.from && f < x.to);
  if (!s) return null;
  const a = Math.min(ramp(f, s.from, s.from + FADE, easeInOutCubic), 1 - ramp(f, s.to - FADE, s.to, easeInOutCubic));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: H * 0.85 - SIZE.subZh * 0.75, width: "100%", textAlign: "center", opacity: a }}>
        <div style={{ fontFamily: FONT.zh, fontWeight: 300, fontSize: SIZE.subZh, color: C.text, opacity: 0.9, letterSpacing: "0.08em" }}>
          {s.zh}
        </div>
        {s.en && (
          <div style={{ fontFamily: FONT.en, fontStyle: "italic", fontSize: SIZE.subEn, color: C.text, opacity: 0.55, marginTop: 10, letterSpacing: "0.02em" }}>
            {s.en}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
