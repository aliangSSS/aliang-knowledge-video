/** Brand palette. Max two accent colours per scene; full colour only once (the twist). */
export const C = {
  bgCenter: "#050910",
  bgEdge: "#020202",
  text: "#EDEDE9", // body / main sentence
  gold: "#F6D392", // highlight: surprise, "yes", lit things
  goldGlow: "#E3AA5E", // halo
  cyan: "#5E8C9A", // predictable, structural, "no", line art
  crimson: "#A53A5B", // noise, error, excluded
  crimsonMask: "rgba(98,30,48,0.55)", // #621E30 translucent
  dim: "rgba(237,237,233,0.55)",
  faint: "rgba(237,237,233,0.28)",
  line: "rgba(237,237,233,0.16)",
};

export const FONT = {
  zh: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif',
  en: '"Lora", "EB Garamond", Georgia, serif',
};

/** 1080p sizes in px. */
export const SIZE = {
  main: 80, // main sentence (72–90), letter-spacing 0.3em, at ~40 % height
  title: 112,
  subZh: 44,
  subEn: 26,
  meta: 28,
  label: 24,
};

export const W = 1920;
export const H = 1080;
/** y of the main sentence line */
export const MAIN_Y = H * 0.4;

export const glowText = (color = C.goldGlow, k = 1) =>
  `0 0 ${10 * k}px ${color}, 0 0 ${26 * k}px ${color}88, 0 0 ${60 * k}px ${color}44`;

/** Blend two #rrggbb colours. */
export const mix = (a: string, b: string, k: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, Math.max(0, k)))).join(",")})`;
};
