import "@fontsource/noto-serif-sc/300.css";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/400-italic.css";
import { continueRender, delayRender } from "remotion";
import { TL } from "./timeline";

/** Fonts ship inside node_modules (no network at render time). The CSS splits CJK into unicode-range slices that load
 * lazily, so block rendering until every slice covering the film's text (TL.glyphs, collected by build.py) is loaded. */
let started = false;
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const h = delayRender("fonts");
  const text = TL.glyphs + "0123456789·—“”《》？！，。：%";
  const faces = ['300 40px "Noto Serif SC"', '400 40px "Noto Serif SC"', '400 40px "Lora"', 'italic 400 40px "Lora"'];
  Promise.all(faces.map((f) => document.fonts.load(f, text)))
    .then(() => document.fonts.ready)
    .then(() => {
      for (const f of faces.slice(0, 2)) {
        if (!document.fonts.check(f, "信息")) console.warn(`[fonts] ${f} did not load — Chinese will fall back`);
      }
      continueRender(h);
    })
    .catch((e) => {
      console.error("[fonts]", e);
      continueRender(h);
    });
};
