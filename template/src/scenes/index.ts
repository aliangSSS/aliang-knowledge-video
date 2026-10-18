import { Placeholder } from "./Placeholder";

/** storyboard.json `type` → component. Every film writes its OWN scenes (src/scenes/<Name>.tsx) and registers them
 * here. Nothing is reused from earlier films except primitives in ../components. */
export const SCENES: Record<string, React.FC> = {
  Placeholder,
};
