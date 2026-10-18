import { hash } from "../lib/anim";
import { C, H, W } from "../lib/theme";

export type ArtKind = "mountains" | "skyline" | "tower" | "antenna" | "probe";

const pathOf = (kind: ArtKind, x: number, y: number, w: number, h: number, seed: number) => {
  if (kind === "mountains") {
    let d = `M${x},${y}`;
    for (let i = 1; i <= 24; i++) {
      const u = i / 24;
      const v = 0.35 + 0.45 * hash(i, 1, seed) + 0.2 * Math.sin(u * 7 + seed);
      d += ` L${x + u * w},${y - (i % 2 ? v : v * 0.55) * h}`;
    }
    return d + ` L${x + w},${y}`;
  }
  if (kind === "skyline") {
    let d = `M${x},${y}`, cx = x;
    while (cx < x + w) {
      const bw = 30 + 70 * hash(cx, 2, seed), bh = h * (0.25 + 0.75 * hash(cx, 3, seed));
      d += ` L${cx},${y - bh} L${Math.min(x + w, cx + bw)},${y - bh}`;
      cx += bw;
    }
    return d + ` L${x + w},${y}`;
  }
  if (kind === "tower") {
    const c = x + w / 2, tw = w * 0.18;
    return `M${c - tw},${y} L${c - tw * 0.7},${y - h * 0.8} L${c + tw * 0.7},${y - h * 0.8} L${c + tw},${y} M${c - tw * 0.9},${y - h * 0.8} L${c - tw * 0.9},${y - h * 0.92} L${c + tw * 0.9},${y - h * 0.92} L${c + tw * 0.9},${y - h * 0.8} M${c},${y - h * 0.92} L${c - 10},${y - h} L${c + 6},${y - h * 0.96}`;
  }
  if (kind === "antenna") {
    const c = x + w / 2;
    return `M${c},${y} L${c},${y - h * 0.45} M${c - w * 0.4},${y - h * 0.55} Q${c},${y - h * 0.2} ${c + w * 0.4},${y - h * 1.0} M${c - w * 0.4},${y - h * 0.55} L${c + w * 0.4},${y - h * 1.0} M${c},${y - h * 0.62} L${c + w * 0.1},${y - h * 0.9} M${c - w * 0.25},${y} L${c + w * 0.25},${y}`;
  }
  const c = x + w / 2, m = y - h / 2;
  return `M${c - w * 0.12},${m - h * 0.12} h${w * 0.24} v${h * 0.24} h${-w * 0.24} Z M${c - w * 0.12},${m} H${x} M${c + w * 0.12},${m} H${x + w} M${x},${m - h * 0.1} v${h * 0.2} M${x + w},${m - h * 0.1} v${h * 0.2} M${c},${m - h * 0.12} L${c},${m - h * 0.45}`;
};

/** Cyan outline drawing (stroke only, low opacity): mountains, beacon tower, skyline, antenna, probe.
 * `draw` 0→1 strokes it on. */
export const LineArt: React.FC<{ kind: ArtKind; x?: number; y?: number; w?: number; h?: number; draw?: number; opacity?: number; seed?: number; color?: string }> = ({
  kind, x = 0, y = H * 0.78, w = W, h = 220, draw = 1, opacity = 0.45, seed = 4, color = C.cyan,
}) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
    <path d={pathOf(kind, x, y, w, h, seed)} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round"
      pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.max(0, Math.min(1, draw))} />
  </svg>
);
