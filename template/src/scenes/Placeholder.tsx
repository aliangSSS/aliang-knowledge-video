import { AbsoluteFill } from "remotion";
import { Kinetic } from "../components";
import { useScene } from "../lib/timeline";

/** Shown until the film's own scenes are written. Every film designs its own scenes (see references/design.md). */
export const Placeholder: React.FC = () => {
  const { f, props: p } = useScene();
  return (
    <AbsoluteFill>
      <Kinetic text={p.text ?? "先写这个主题自己的场景"} f={f} at={6} y={430} size={64} />
    </AbsoluteFill>
  );
};
