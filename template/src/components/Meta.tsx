import { useContext } from "react";
import { HudCtx } from "../lib/timeline";
import { C, FONT, SIZE } from "../lib/theme";

/** Screen-fixed layer inside a scene: children stay put while the scene's content moves with the camera. */
export const Hud: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useContext(HudCtx);
  return <div style={{ position: "absolute", inset: 0, transform: t, transformOrigin: "50% 50%", pointerEvents: "none" }}>{children}</div>;
};

/** Low-contrast corner info: "第 3 问", "剩余 128 种可能", "1969 · 阿波罗 11 号 · 休斯敦". Screen-fixed (HUD). */
export const Meta: React.FC<{ children: React.ReactNode; corner?: "tl" | "tr" | "bl" | "br"; opacity?: number; color?: string }> = ({
  children, corner = "tl", opacity = 1, color = C.dim,
}) => {
  const pos: React.CSSProperties = {
    tl: { left: 90, top: 70 }, tr: { right: 90, top: 70, textAlign: "right" },
    bl: { left: 90, bottom: 70 }, br: { right: 90, bottom: 70, textAlign: "right" },
  }[corner] as React.CSSProperties;
  return (
    <Hud>
      <div style={{ position: "absolute", ...pos, fontFamily: FONT.zh, fontWeight: 300, fontSize: SIZE.meta, letterSpacing: "0.25em", color, opacity }}>
        {children}
      </div>
    </Hud>
  );
};

/** Small bilingual label under a number / formula: "复利 · COMPOUND INTEREST". */
export const Label: React.FC<{ zh?: string; en?: string; color?: string; opacity?: number }> = ({ zh, en, color = C.gold, opacity = 1 }) => (
  <div style={{ fontFamily: FONT.zh, fontWeight: 300, fontSize: SIZE.label, letterSpacing: "0.3em", color, opacity, textAlign: "center" }}>
    {zh}
    {zh && en ? " · " : ""}
    {en && <span style={{ fontFamily: FONT.en, fontSize: SIZE.label * 0.8, letterSpacing: "0.35em" }}>{en.toUpperCase()}</span>}
  </div>
);
