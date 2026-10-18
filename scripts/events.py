"""Scene events -> frames on the beat grid, plus the sfx / duck / flash / debug-cue lists.

event: {"name", "at", "snap", "repeat": {"count", "every"}, "roll": [beat steps], "sfx", "tickSfx", "duck", "flash"}
  at:   seconds from scene start, or "start" / "end" / "sub2.in" / "sub2.out" / "@reveal" (a musical hit from
        beats.json) / "<earlier event name>",
        each optionally followed by "+0.5" (seconds) or "-2b" (beats).
  snap: none | beat (default) | half | quarter | downbeat | accent
  repeat: frames at at, at+every beats, ... (each gets the sfx)
  roll: accelerating run that LANDS on `at`; ticks are placed backwards by the beat steps, e.g. [1,1,.5,.5,.25,.25]
  sfx:  "stamp" or {"type", "note", "dur", "gain", "pan", "variant", "offset", "base", "to"} or a list
  shake: true / amplitude in px / {"amp", "n"}: screen shake starting on this event
"""
import math
import re

NOTE_DIR = {"up": 1, "down": -1}


def frame_of(t, fps):
    """Floor, so a visual is never later than its sound (it may lead by < 1 frame)."""
    return int(math.floor(t * fps + 1e-6))


def _base(at, t0, t1, subs, known, warn, where, hits):
    s = str(at).strip()
    m = re.match(r"^(.*?)\s*([+-]\s*[\d.]+)\s*(b?)$", s)
    head, off, unit = (m.group(1), float(m.group(2).replace(" ", "")), m.group(3)) if m else (s, 0.0, "")
    head = head.strip()
    if head in ("", "start"):
        t = t0
    elif head == "end":
        t = t1
    elif head.startswith("@"):
        if head[1:] not in hits:
            warn(f"{where}: 没有叫 {head} 的音乐锚点，可用 {['@' + k for k in hits]}")
            return t0, 0.0, ""
        t = hits[head[1:]]
    elif re.match(r"^sub\d+(\.(in|out))?$", head):
        k, _, edge = head[3:].partition(".")
        if int(k) >= len(subs):
            warn(f"{where}: 没有 sub{k}")
            return t0, 0.0, ""
        t = subs[int(k)]["t1" if edge == "out" else "t0"]
    elif head in known:
        t = known[head]
    else:
        warn(f"{where}: 不认识的时间点「{head}」")
        t = t0
    return t, off, unit


def _sfx_list(spec):
    if not spec:
        return []
    return [{"type": x} if isinstance(x, str) else dict(x) for x in (spec if isinstance(spec, list) else [spec])]


def resolve_events(sc, t0, t1, subs, grid, fps, warn, out):
    rel, known = {}, {}
    for ev in sc.get("events", []):
        name = ev["name"]
        where = f"{sc['id']}.{name}"
        raw = t0 + float(ev["at"]) if isinstance(ev.get("at", 0), (int, float)) else None
        if raw is None:
            base, off, unit = _base(ev["at"], t0, t1, subs, known, warn, where, grid.hits)
            raw = grid.time(grid.pos(base) + off) if unit == "b" else base + off
        mode = ev.get("snap", "beat")
        land = grid.snap(raw, mode)
        main, ticks = [land], []
        if "repeat" in ev:
            r = ev["repeat"]
            p = grid.pos(land)
            main = [grid.time(p + k * r.get("every", 1)) for k in range(int(r["count"]))]
        if "roll" in ev:
            p, acc = grid.pos(land), 0.0
            for st in reversed(ev["roll"]):
                acc += st
                ticks.append(grid.time(p - acc))
            ticks.reverse()
        frames = [frame_of(t, fps) for t in main]
        tick_f = [frame_of(t, fps) for t in ticks]
        for t, f in zip(main + ticks, frames + tick_f):
            out["checks"].append({"cue": where, "f": f, "target": round(t, 4), "snap": mode,
                                  "dev": round(f - t * fps, 3), "shift": round(land - raw, 3)})
        if any(f < frame_of(t0, fps) or f > frame_of(t1, fps) for f in frames + tick_f):
            warn(f"{where}: 有帧落在场景外（{t0:.2f}-{t1:.2f}s）")
        known[name] = land
        f0 = frame_of(t0, fps)
        rel[name] = {"f": frames[0] - f0, "fs": [f - f0 for f in frames] if "repeat" in ev else [],
                     "ticks": [f - f0 for f in tick_f]}
        for k, (lst, times) in enumerate(((ev.get("sfx"), main), (ev.get("tickSfx"), ticks))):
            for spec in _sfx_list(lst):
                for n, t in enumerate(times):
                    note = spec.get("note", 0)
                    if isinstance(note, str):
                        note = spec.get("base", 0) + NOTE_DIR.get(note, 0) * n
                    out["sfx"].append({"t": round(t + spec.get("offset", 0.0), 4), "type": spec["type"], "note": note,
                                       "dur": spec.get("dur"), "gain": spec.get("gain", 0.0), "pan": spec.get("pan", 0),
                                       "variant": spec.get("variant"), "cue": where})
        if ev.get("shake"):
            sh = ev["shake"] if isinstance(ev["shake"], dict) else {"amp": ev["shake"] if ev["shake"] is not True else 14}
            out["shakes"].append({"f": frames[0], "amp": sh.get("amp", 14), "n": sh.get("n", 12)})
        if ev.get("duck"):
            d = ev["duck"] if isinstance(ev["duck"], dict) else {}
            out["ducks"].append({"t": land, "pre": d.get("pre", 0.8), "post": d.get("post", 0.25), "db": d.get("db", -8)})
        if ev.get("flash"):
            out["flashes"].append({"f": frames[0], "n": ev["flash"] if isinstance(ev["flash"], int) and ev["flash"] > 1 else 3})
        out["cues"].append({"f": frames[0], "name": where})
    return rel
