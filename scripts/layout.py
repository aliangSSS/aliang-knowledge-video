"""storyboard.json + beats.json -> scene boundaries and subtitle times (seconds).
Narrative layer: subtitles follow reading pace, never the beat. Event layer: scene cuts land on downbeats,
anchored scenes start exactly on a musical hit. Breathing layer: lead / tail / gaps."""
import re

import numpy as np

HOLD_MIN, PER_CHAR, HOLD_BASE, HOLD_CAP = 3.5, 0.22, 1.0, 6.5
GAP_IN, LEAD, TAIL, MAX_ZH = 0.9, 0.8, 1.0, 22


def zh_len(s):
    """Reading length: CJK characters, plus each latin word / number counts as one."""
    return len(re.findall(r"[㐀-鿿豈-﫿]", s)) + len(re.findall(r"[A-Za-z0-9]+(?:[.%][0-9]+)?", s))


def hold_of(sub):
    return max(HOLD_MIN, zh_len(sub["zh"]) * PER_CHAR + HOLD_BASE)


class Grid:
    def __init__(self, b):
        self.beats = np.array(b["beats"], float)
        self.downs = np.array(b["downbeats"], float)
        self.acc = [a for a in b["accents"] if a["s"] >= 0.3] or b["accents"]
        self.ambient = bool(b.get("ambient"))
        self.hits = b.get("hits", {})
        self.period = float(np.median(np.diff(self.beats))) if len(self.beats) > 1 else 0.5

    def pos(self, t):
        B = self.beats
        if t <= B[0]:
            return (t - B[0]) / self.period
        if t >= B[-1]:
            return len(B) - 1 + (t - B[-1]) / self.period
        return float(np.interp(t, B, np.arange(len(B))))

    def time(self, p):
        B = self.beats
        if p <= 0:
            return float(B[0] + p * self.period)
        if p >= len(B) - 1:
            return float(B[-1] + (p - len(B) + 1) * self.period)
        return float(np.interp(p, np.arange(len(B)), B))

    def snap(self, t, mode):
        if mode in (None, "none", "frame"):
            return t
        if mode == "downbeat":
            return float(self.downs[np.argmin(np.abs(self.downs - t))]) if len(self.downs) else t
        if mode == "accent":
            c = [a for a in self.acc if abs(a["t"] - t) <= 0.6]
            return max(c, key=lambda a: a["s"] - 0.5 * abs(a["t"] - t))["t"] if c else self.snap(t, "downbeat")
        div = {"beat": 1, "half": 2, "quarter": 4}.get(mode)
        if div is None:
            raise ValueError(f"未知 snap 模式 {mode}（none/beat/half/quarter/downbeat/accent）")
        return self.time(round(self.pos(t) * div) / div)


def need_of(sc):
    subs = sc.get("subs", [])
    body = sum(s.get("hold", hold_of(s)) for s in subs) + sum(s.get("gap", GAP_IN) for s in subs[1:])
    natural = sc.get("lead", LEAD) + body + sc.get("tail", TAIL) if subs else 4.0
    return max(sc.get("minSec", 0), natural)


def layout_scenes(scenes, b, grid, warn):
    """Start time of every scene. Anchored scenes are fixed points; the rest share the time between them."""
    dur, hits = b["duration"], b.get("hits", {})
    need = [need_of(s) for s in scenes]
    fixed = {0: 0.0}
    for i, s in enumerate(scenes[1:], 1):
        a = s.get("anchor")
        if a is None:
            continue
        t = hits.get(a) if isinstance(a, str) else float(a)
        if t is None:
            warn(f"{s['id']}: 未知 anchor「{a}」，可用 {list(hits)} 或秒数")
            continue
        fixed[i] = float(t) + s.get("anchorOffset", 0.0)
    idx = sorted(fixed)
    for a, c in zip(idx, idx[1:]):
        if fixed[c] <= fixed[a] + 2:
            warn(f"anchor 顺序不对：{scenes[c]['id']} ({fixed[c]:.1f}s) 不晚于 {scenes[a]['id']} ({fixed[a]:.1f}s)")
    starts = [0.0] * len(scenes)
    for k, i0 in enumerate(idx):
        i1 = idx[k + 1] if k + 1 < len(idx) else len(scenes)
        t0, t1 = fixed[i0], fixed[i1] if i1 < len(scenes) else dur
        S, A = sum(need[i0:i1]), t1 - t0
        names = f"{scenes[i0]['id']}…{scenes[i1 - 1]['id']}"
        if S > A + 0.05:
            warn(f"{names} 需要 {S:.1f}s 但只有 {A:.1f}s（超 {S - A:.1f}s）：删/缩字幕、减 minSec，或换 anchor")
        elif A > 1.35 * S and A - S > 6:
            warn(f"{names} 内容偏少：{S:.1f}s 的内容要撑 {A:.1f}s。加字幕/场景，或加大 minSec")
        sc, t = A / S if S else 1.0, t0
        for i in range(i0, i1):
            starts[i] = t
            t += need[i] * sc
    strong = [a["t"] for a in grid.acc] if grid.ambient else list(grid.downs)
    grid_pts = [(c, 0.0) for c in strong] + [(c, 1.0) for c in grid.beats if c not in set(strong)]  # plain beat: penalty
    for i in range(1, len(scenes)):  # free cuts go onto a downbeat (accent if the track has no clear beat)
        if i in fixed:
            continue
        nxt = starts[i + 1] if i + 1 < len(scenes) else dur
        best = None
        for c, pen in grid_pts:
            if abs(c - starts[i]) > 1.6 or not (starts[i - 1] + 2 <= c <= nxt - 2):
                continue
            short = max(0, need[i - 1] - (c - starts[i - 1])) + max(0, need[i] - (nxt - c))
            sc = abs(c - starts[i]) + 4 * short + pen  # prefer a downbeat that doesn't squeeze either neighbour
            if best is None or sc < best[0]:
                best = (sc, c)
        if best:
            starts[i] = best[1]
    return starts, need, fixed


def place_subs(sc, t0, t1, warn):
    subs = sc.get("subs", [])
    if not subs:
        return []
    lead, tail = sc.get("lead", LEAD), sc.get("tail", TAIL)
    holds = [s.get("hold", hold_of(s)) for s in subs]
    gaps = [0.0] + [s.get("gap", GAP_IN) for s in subs[1:]]
    avail, body = (t1 - t0) - lead - tail, sum(holds) + sum(gaps)
    if body > avail:
        k = max(avail, 1.0) / body
        holds, gaps = [h * k for h in holds], [g * k for g in gaps]
    else:
        extra = avail - body
        room = [0.0 if "hold" in s else max(0.0, min(HOLD_CAP, h * 1.3) - h) for s, h in zip(subs, holds)]
        give = min(extra * 0.6, sum(room))
        if sum(room):
            holds = [h + give * r / sum(room) for h, r in zip(holds, room)]
        lead += (extra - give) * 0.35
    out, t = [], t0 + lead
    for i, s in enumerate(subs):
        t = t0 + s["at"] if "at" in s else t + gaps[i]
        nxt = next((t0 + q["at"] for q in subs[i + 1:i + 2] if "at" in q), None)
        h = holds[i]
        if nxt is not None and t + h > nxt - GAP_IN:  # a stretched hold must not crowd the next pinned subtitle
            h = max(min(h, nxt - GAP_IN - t), s.get("hold", hold_of(s)))
        out.append({"zh": s["zh"], "en": s.get("en", ""), "t0": t, "t1": t + h, "scene": sc["id"], "i": i,
                    "need": hold_of(s)})
        t += h
    if out[-1]["t1"] > t1 + 0.01:
        warn(f"{sc['id']}: 最后一条字幕超出场景 {out[-1]['t1'] - t1:.2f}s（检查 sub 的 at，或给场景加 minSec）")
    elif out[-1]["t1"] > t1 - 0.3:
        warn(f"{sc['id']}: 最后一条字幕离场景结束只剩 {t1 - out[-1]['t1']:.2f}s，太挤")
    return out
