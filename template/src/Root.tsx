import { Composition } from "remotion";
import { TL } from "./lib/timeline";
import { Video } from "./Video";

export const RemotionRoot = () => (
  <>
    <Composition id="Main" component={Video} durationInFrames={TL.frames} fps={TL.fps} width={TL.width} height={TL.height} defaultProps={{ debug: false }} />
    <Composition id="Debug" component={Video} durationInFrames={TL.frames} fps={TL.fps} width={TL.width} height={TL.height} defaultProps={{ debug: true }} />
  </>
);
