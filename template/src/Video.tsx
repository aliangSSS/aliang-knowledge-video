import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Background } from "./components/Background";
import { DebugOverlay } from "./components/Debug";
import { Flashes } from "./components/Flash";
import { Subtitles } from "./components/Subtitle";
import { easeInOutCubic, hash, ramp } from "./lib/anim";
import { camAt, camTransform, contentCam, hudTransform, worldTransform } from "./lib/camera";
import { loadFonts } from "./lib/fonts";
import { CamCtx, FPS, HudCtx, SceneCtx, TL } from "./lib/timeline";
import { transStyle } from "./lib/transitions";
import { SCENES } from "./scenes";
import { World } from "./World";

loadFonts();

/** Frames each scene is mounted: its own span plus the transition windows that overlap its neighbours. */
const windows = TL.scenes.map((s, i) => {
  const nx = TL.scenes[i + 1];
  const a = Math.min(s.from, s.in ? s.in.f0 : s.from);
  const b = Math.max(s.from + s.dur, nx?.in ? nx.in.f1 : s.from + s.dur);
  return { a, b };
});

const Scene: React.FC<{ i: number }> = ({ i }) => {
  const F = useCurrentFrame() + windows[i].a; // absolute frame
  const s = TL.scenes[i], nx = TL.scenes[i + 1];
  const Comp = SCENES[s.type];
  if (!Comp) throw new Error(`No scene component "${s.type}" — register it in src/scenes/index.ts`);
  const p = (t: { f0: number; f1: number }) => (F - t.f0) / Math.max(1, t.f1 - t.f0);
  const tin = s.in && F >= s.in.f0 && F < s.in.f1 ? transStyle(s.in, "in", p(s.in), F) : null;
  const tout = nx?.in && F >= nx.in.f0 && F < nx.in.f1 ? transStyle(nx.in, "out", p(nx.in), F) : null;
  if (F < s.from && !tin) return null;
  if (F >= s.from + s.dur && !tout) return null;
  const lf = F - s.from, fi = s.fadeIn * FPS, fo = s.fadeOut * FPS;
  const fade = Math.min(fi > 0 ? ramp(lf, 0, fi, easeInOutCubic) : 1, fo > 0 ? 1 - ramp(lf, s.dur - fo, s.dur, easeInOutCubic) : 1);
  const at = s.in?.at ?? [960, 540];
  const cc = contentCam(i, F);
  return (
    <AbsoluteFill style={{ ...tout?.style, transformOrigin: tout?.style.transformOrigin ?? `${at[0]}px ${at[1]}px` }}>
      <AbsoluteFill style={{ ...tin?.style, transformOrigin: tin?.style.transformOrigin ?? `${at[0]}px ${at[1]}px` }}>
        <AbsoluteFill style={{ opacity: fade, transform: camTransform(s.cam0, cc) }}>
          <SceneCtx.Provider value={{ s, off: s.from - windows[i].a }}>
            <HudCtx.Provider value={hudTransform(s.cam0, cc)}>
              <Comp />
            </HudCtx.Provider>
          </SceneCtx.Provider>
        </AbsoluteFill>
      </AbsoluteFill>
      {tin?.overlay}
    </AbsoluteFill>
  );
};

const shakeAt = (F: number) => {
  let x = 0, y = 0;
  for (const s of TL.shakes) {
    const k = F - s.f;
    if (k < 0 || k > s.n) continue;
    const a = s.amp * Math.exp(-k / (s.n / 3));
    x += (hash(F, 11) - 0.5) * 2 * a;
    y += (hash(F, 13) - 0.5) * 2 * a;
  }
  return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
};

export const Video: React.FC<{ debug?: boolean }> = ({ debug = false }) => {
  const F = useCurrentFrame();
  const cam = camAt(F);
  return (
    <AbsoluteFill style={{ background: "#020202" }}>
      <CamCtx.Provider value={cam}>
        <AbsoluteFill style={{ transform: shakeAt(F) }}>
          {TL.meta.bg !== false && <Background {...(TL.meta.bg ?? {})} />}
          <AbsoluteFill style={{ transformOrigin: "0 0", transform: worldTransform(cam) }}>
            <World />
          </AbsoluteFill>
          {TL.scenes.map((s, i) => (
            <Sequence key={s.id} from={windows[i].a} durationInFrames={Math.max(1, windows[i].b - windows[i].a)} name={s.id}>
              <Scene i={i} />
            </Sequence>
          ))}
        </AbsoluteFill>
      </CamCtx.Provider>
      <Subtitles />
      <Flashes />
      {debug && <DebugOverlay />}
      <Audio src={staticFile("audio/mix.wav")} />
    </AbsoluteFill>
  );
};
