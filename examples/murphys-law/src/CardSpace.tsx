import { card, cardRect, tiltOf } from "./board";
import { useScene } from "./lib/timeline";

/** Rotates a scene's live drawing by its card's resting tilt, so it sits exactly on the card. */
export const CardSpace: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { scene } = useScene();
  const c = card(id), r = cardRect(c, scene);
  return <div style={{ position: "absolute", inset: 0, transform: `rotate(${tiltOf(c)}deg)`, transformOrigin: `${r.cx}px ${r.cy}px` }}>{children}</div>;
};
