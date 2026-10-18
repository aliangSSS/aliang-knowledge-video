"""Scene transitions + cameras -> timeline fields, plus the sfx that sell them.

scene "in": "fade" | {"type", "dur" (s), "align": end|center|start, "dir": 1|-1, "axis": "x"|"y", "at": [x, y] (px),
                      "bow": 0..1 (pan: pull back mid-move), "sfx": false | "swish" | {...}}
  end    = the move lands on the scene start (the downbeat): pan push zoom whip wipe iris rise
  center = straddles it: fade black blur glitch
scene "cam": {"x", "y", "z"} world camera (default: inherit the previous scene's start camera)
scene "camTo": camera at the end of the scene; default = cam pushed in by "drift" (default 0.02); "drift": 0 = static
"""
from events import frame_of

TYPES = ("cut", "flash", "fade", "black", "pan", "push", "zoom", "whip", "wipe", "iris", "blur", "rise", "glitch")
DUR = {"fade": 0.5, "black": 0.8, "pan": 1.2, "push": 0.7, "zoom": 0.6, "whip": 0.35, "wipe": 0.6, "iris": 0.8,
       "blur": 0.6, "rise": 0.6, "glitch": 0.35}
ALIGN = {"fade": "center", "black": "center", "blur": "center", "glitch": "center"}


def norm(spec, anchored, first):
    if first:
        return None
    if spec is None:
        spec = "cut" if anchored else "fade"
    t = {"type": spec} if isinstance(spec, str) else dict(spec)
    if t["type"] not in TYPES:
        raise ValueError(f"未知转场 {t['type']}，可用：{', '.join(TYPES)}")
    return t


def resolve(i, sc, f0, prev, nxt_f, fps, warn, out):
    """Transition + cameras for scene i (prev = previous scene's timeline entry). Returns (trans, cam0, cam1)."""
    anchored = sc.get("anchor") is not None
    t = norm(sc.get("in"), anchored, i == 0)
    base = prev["cam0"] if prev else {"x": 0, "y": 0, "z": 1}
    c0 = {**base, **sc.get("cam", {})}
    drift = sc.get("drift", 0.02)
    c1 = {**c0, **sc["camTo"]} if "camTo" in sc else {**c0, "z": c0["z"] * (1 + drift)}
    if not t or t["type"] in ("cut", "flash"):
        if t and t["type"] == "flash":
            out["flashes"].append({"f": f0, "n": 3})
        return ({"type": t["type"], "f0": f0, "f1": f0, "dir": 1, "axis": "x", "at": [960, 540], "bow": 0} if t else None), c0, c1
    n = max(2, round(t.get("dur", DUR[t["type"]]) * fps))
    al = t.get("align", ALIGN.get(t["type"], "end"))
    a = f0 - n if al == "end" else f0 - n // 2 if al == "center" else f0
    a = max(a, prev["from"] + 1)
    b = min(a + n, nxt_f - 1)
    if (b - a) * 2 > min(prev["dur"], nxt_f - f0):
        warn(f"{sc['id']}: 转场 {t['type']} {(b - a) / fps:.2f}s 太长，超过相邻场景的一半")
    if t["type"] == "pan" and c0 == prev["cam1"] == prev["cam0"]:
        warn(f"{sc['id']}: pan 转场但两个场景的 cam 一样，画面不会动——给 cam 设不同位置，或改用 push")
    tr = {"type": t["type"], "f0": a, "f1": b, "dir": t.get("dir", 1), "axis": t.get("axis", "x"),
          "at": t.get("at", [960, 540]), "bow": t.get("bow", 0)}
    sfx = t.get("sfx", "auto")
    if sfx:
        mid, end = (a + 0.55 * (b - a)) / fps, b / fps
        if t["type"] == "pan":
            dx = c0["x"] - prev["cam1"]["x"]
            p = 0.6 if dx > 0 else -0.6 if dx < 0 else 0
            auto = {"type": "swish", "t": mid, "pan": [p, -p], "dur": max(0.35, (b - a) / fps * 0.8)}
        elif t["type"] in ("push", "whip", "wipe"):
            p = 0.5 * tr["dir"] if tr["axis"] == "x" else 0
            auto = {"type": "swish", "t": (a + b) / 2 / fps, "pan": [p, -p], "dur": max(0.25, (b - a) / fps)}
        elif t["type"] == "zoom":
            auto = {"type": "suck", "t": end, "dur": max(0.3, (b - a) / fps)}
        elif t["type"] == "glitch":
            auto = {"type": "glitch", "t": a / fps}
        else:
            auto = None
        if auto and sfx != "auto":
            auto = {**auto, **({"type": sfx} if isinstance(sfx, str) else sfx)}
        if auto:
            out["sfx"].append({"t": round(auto["t"] + auto.get("offset", 0), 4), "type": auto["type"], "note": auto.get("note", 0),
                               "dur": auto.get("dur"), "gain": auto.get("gain", 0.0), "pan": auto.get("pan", 0),
                               "variant": auto.get("variant"), "cue": f"{sc['id']}.in"})
    out["cues"].append({"f": a, "name": f"{sc['id']}.in:{t['type']}"})
    return tr, c0, c1
