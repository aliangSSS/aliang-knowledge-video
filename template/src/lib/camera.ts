import { clamp, easeInOutCubic, lerp } from "./anim";
import { Cam, SceneData, TL } from "./timeline";
import { H, W } from "./theme";

/** World coordinates are pixels; (0,0) is the centre of the default view. A camera {x,y,z} looks at world (x,y)
 * with zoom z (z=2 → everything twice as big). Scenes are authored in screen pixels as they look when the camera
 * equals that scene's own "cam"; the engine moves them with the world when the camera moves. */
export const lerpCam = (a: Cam, b: Cam, k: number): Cam => ({
  x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)),
});

/** A scene's own camera at absolute frame F: eased cam0 → cam1 across the scene (the slow drift / Ken Burns). */
export const sceneCam = (s: SceneData, F: number): Cam =>
  lerpCam(s.cam0, s.cam1, easeInOutCubic(clamp((F - s.from) / Math.max(1, s.dur))));

const panAt = (i: number, F: number): Cam | null => {
  const t = TL.scenes[i].in;
  if (!t || t.type !== "pan" || F < t.f0 || F >= t.f1) return null;
  const k = easeInOutCubic((F - t.f0) / Math.max(1, t.f1 - t.f0));
  const c = lerpCam(sceneCam(TL.scenes[i - 1], t.f0), sceneCam(TL.scenes[i], t.f1), k);
  return { ...c, z: c.z * (1 - 0.6 * t.bow * Math.sin(Math.PI * k)) };
};

/** Global camera at absolute frame F (drives the World layer). */
export const camAt = (F: number): Cam => {
  const sc = TL.scenes;
  for (let i = 1; i < sc.length; i++) {
    const p = panAt(i, F);
    if (p) return p;
  }
  let i = sc.length - 1;
  while (i > 0 && F < sc[i].from) i--;
  return sceneCam(sc[i], F);
};

/** Camera a scene's content is rendered with: the travelling camera while it takes part in a pan, else its own. */
export const contentCam = (i: number, F: number): Cam => panAt(i, F) ?? (TL.scenes[i + 1] ? panAt(i + 1, F) : null) ?? sceneCam(TL.scenes[i], F);

/** Offset + scale (about the screen centre) that moves content authored for camera `base` to camera `c`. */
export const camParams = (base: Cam, c: Cam) => ({ dx: (base.x - c.x) * c.z, dy: (base.y - c.y) * c.z, s: c.z / base.z });
export const camTransform = (base: Cam, c: Cam) => {
  const { dx, dy, s } = camParams(base, c);
  return `translate(${dx}px, ${dy}px) scale(${s})`;
};
/** The inverse: keeps HUD elements (corner labels, counters) fixed on screen while the scene moves with the world. */
export const hudTransform = (base: Cam, c: Cam) => {
  const { dx, dy, s } = camParams(base, c);
  return `scale(${1 / s}) translate(${-dx}px, ${-dy}px)`;
};

/** CSS transform for the World layer under camera c (world origin → screen centre). */
export const worldTransform = (c: Cam) => `translate(${W / 2}px, ${H / 2}px) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;

/** World point → screen point under camera c. */
export const toScreen = (x: number, y: number, c: Cam) => ({ x: W / 2 + (x - c.x) * c.z, y: H / 2 + (y - c.y) * c.z });
