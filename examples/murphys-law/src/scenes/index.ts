import { KnotExhibit, Montage, Pinboard, QueueExhibit, TitleCase, ToastExhibit } from "./Act1";
import { CityZoom, Culprit, MemoryCalendar, Verdict } from "./Act2";
import { Archive, CaseClosed, Fixes, Launch } from "./Act3";

/** storyboard.json `type` → component. This film's own scenes (墨菲定律: an investigation on an evidence wall). */
export const SCENES: Record<string, React.FC> = {
  Montage, Pinboard, TitleCase, QueueExhibit, ToastExhibit, KnotExhibit,
  MemoryCalendar, Culprit, CityZoom, Verdict,
  Archive, Launch, Fixes, CaseClosed,
};
