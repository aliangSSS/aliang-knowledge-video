import { useCurrentFrame } from "remotion";
import { useCamera } from "./lib/timeline";

/** Optional persistent world that the camera travels through (an evidence wall, a map, a timeline, a city, a
 * circuit board…). Drawn in world pixels: (0,0) is the centre of the default view, z=1 is 1 world px = 1 screen px.
 * Scenes set "cam" in storyboard.json to look at a part of it; "pan" transitions fly the camera between them.
 * Leave it empty (return null) when the film has no shared space.
 *
 * Available here: useCurrentFrame() (absolute frame), useCamera() ({x, y, z}), TL from ./lib/timeline
 * (e.g. TL.scenes.find(s => s.id === "x") to sync world details to a scene's events). */
export const World: React.FC = () => {
  useCurrentFrame();
  useCamera();
  return null;
};
