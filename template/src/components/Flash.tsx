import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TL } from "../lib/timeline";

/** Global 2–3 frame warm-white flash, triggered by `"flash": true` on a storyboard event. */
export const Flashes: React.FC = () => {
  const f = useCurrentFrame();
  const fl = TL.flashes.find((x) => f >= x.f && f < x.f + x.n + 3);
  if (!fl) return null;
  const k = f - fl.f;
  const a = k < fl.n ? 0.92 - 0.12 * k : Math.max(0, 0.55 - 0.18 * (k - fl.n + 1));
  return <AbsoluteFill style={{ background: "#fff6e6", opacity: a, pointerEvents: "none" }} />;
};
