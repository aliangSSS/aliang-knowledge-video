import { clamp } from "./lib/anim";
import { sceneCam } from "./lib/camera";
import { panIn, panOut } from "./lib/transitions";
import { SceneData, TL } from "./lib/timeline";

/** The evidence wall (world px; (0,0) = centre of the default view). */
/** stamp: where the verdict stamp lands, as fractions of the card (keeps it off the card's live drawing). */
export type Card = { id: string; x: number; y: number; w: number; h: number; label: string; scene?: string; stamp?: [number, number] };
export const CARDS: Card[] = [
  { id: "case", x: 0, y: 0, w: 560, h: 380, label: "案卷", scene: "title" },
  { id: "suspect", x: 0, y: 470, w: 420, h: 180, label: "被告", scene: "verdict" },
  { id: "queue", x: -1050, y: -380, w: 520, h: 360, label: "证物 1 · 排队", scene: "queue", stamp: [0.7, 0.82] },
  { id: "toast", x: 0, y: -580, w: 520, h: 360, label: "证物 2 · 吐司", scene: "toast", stamp: [0.3, 0.8] },
  { id: "knot", x: 1050, y: -380, w: 520, h: 360, label: "证物 3 · 耳机线", scene: "knot", stamp: [0.68, 0.82] },
  { id: "umbrella", x: -1050, y: 330, w: 520, h: 360, label: "刚出门就下雨" },
  { id: "battery", x: 1050, y: 330, w: 520, h: 360, label: "电量 1%" },
  { id: "calendar", x: 0, y: 1020, w: 820, h: 420, label: "证物 4 · 一个月", scene: "memory" },
];
export const card = (id: string) => CARDS.find((c) => c.id === id)!;
export const BOARD = { x0: -1700, y0: -1100, x1: 1700, y1: 1600 };
/** Resting tilt of a card in degrees (exhibits barely, so their live drawing lines up). */
export const tiltOf = (c: Card) => {
  const h = Math.sin(c.x * 12.9898 + c.y * 78.233) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * (c.scene ? 2.4 : 5);
};
/** Point on card c's border in the direction of (tx, ty): red thread runs border to border, never across a card. */
export const edge = (c: Card, tx: number, ty: number): [number, number] => {
  const dx = tx - c.x, dy = ty - c.y;
  const k = Math.min(Math.abs((c.w / 2) / (dx || 1e-6)), Math.abs((c.h / 2) / (dy || 1e-6)));
  return [c.x + dx * k, c.y + dy * k];
};
export const BOARD_SCENES = new Set(TL.scenes.filter((s) => s.props.board).map((s) => s.id));

export const scene = (id: string) => TL.scenes.find((s) => s.id === id);
/** Absolute frame of a scene's event (null when the scene / event doesn't exist). */
export const evAbs = (sid: string, ev: string) => {
  const s = scene(sid);
  return s && s.events[ev] ? s.from + s.events[ev].f : null;
};

/** How present scene s is at absolute frame F (0..1). "content" mirrors the scene's drawn opacity (lib/transitions);
 * "share" is its share of the transition (pans hand over linearly, so the wall stays fully visible while flying). */
const presence = (i: number, F: number, mode: "content" | "share" = "content") => {
  const s = TL.scenes[i], nx = TL.scenes[i + 1];
  const w = (t: SceneData["in"], role: "in" | "out") => {
    if (!t || F < t.f0 || F >= t.f1) return null;
    const k = (F - t.f0) / Math.max(1, t.f1 - t.f0);
    if (t.type === "black") return role === "in" ? clamp(k * 2 - 1) : 1 - clamp(k * 2);
    if (t.type === "pan" && mode === "content") return role === "in" ? panIn(k) : panOut(k);
    return role === "in" ? k : 1 - k;
  };
  const a = w(s.in, "in"), b = nx ? w(nx.in, "out") : null;
  if (a !== null) return a;
  if (b !== null) return b;
  return F >= s.from && F < s.from + s.dur ? 1 : 0;
};

/** Opacity of the evidence wall: sum of the presence of every scene that lives on it. */
export const boardOpacity = (F: number) =>
  clamp(TL.scenes.reduce((a, s, i) => a + (BOARD_SCENES.has(s.id) ? presence(i, F, "share") : 0), 0));

/** How much a card's own scene is on screen (0..1): the live scene replaces the card's static thumbnail. */
export const live = (c: Card, F: number) => {
  const i = TL.scenes.findIndex((s) => s.id === c.scene);
  return i < 0 ? 0 : presence(i, F);
};

/** Where a card sits in a scene's own screen space (scenes are authored for their cam0). */
export const cardRect = (c: Card, s: SceneData) => {
  const cam = s.cam0;
  return { cx: 960 + (c.x - cam.x) * cam.z, cy: 540 + (c.y - cam.y) * cam.z, w: c.w * cam.z, h: c.h * cam.z, k: cam.z };
};

/** The world camera at absolute frame F, for world details that need it. */
export const camOf = (sid: string, F: number) => {
  const s = scene(sid);
  return s ? sceneCam(s, F) : { x: 0, y: 0, z: 1 };
};
