"""storyboard.json + analysis/beats.json -> src/data/timeline.json, public/audio/mix.wav, out/build_report.txt
usage: python tools/build.py [--no-audio] [--stems]      (run from the project root; re-run after every storyboard edit)"""
import argparse

import mix as M
import transitions as T
from common import FPS, ROOT, die, load_json, save_json, utf8_stdout
from events import frame_of, resolve_events
from layout import MAX_ZH, Grid, layout_scenes, place_subs, zh_len


def glyphs(o, acc):
    if isinstance(o, str):
        acc.update(o)
    elif isinstance(o, dict):
        for v in o.values():
            glyphs(v, acc)
    elif isinstance(o, list):
        for v in o:
            glyphs(v, acc)
    return acc


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-audio", action="store_true", help="只排时间线，不混音（改画面时更快）")
    ap.add_argument("--stems", action="store_true", help="另存 BGM / 音效分轨")
    a = ap.parse_args()
    if not (ROOT / "storyboard.json").exists():
        die("没有 storyboard.json（要在项目根目录运行）")
    if not (ROOT / "analysis" / "beats.json").exists():
        die("没有 analysis/beats.json：先跑 tools/prepare_bgm.py 或 tools/gen_bgm.py")
    sb, b = load_json(ROOT / "storyboard.json"), load_json(ROOT / "analysis" / "beats.json")
    meta, scenes = sb.get("meta", {}), sb["scenes"]
    fps = meta.get("fps", FPS)
    ids = [s["id"] for s in scenes]
    if len(set(ids)) != len(ids):
        die("scene id 有重复")
    warns = []
    grid, dur = Grid(b), b["duration"]
    n_frames = int(round(dur * fps))
    starts, need, fixed = layout_scenes(scenes, b, grid, warns.append)
    out = {"sfx": [], "ducks": [], "flashes": [], "cues": [], "checks": [], "shakes": []}
    tl_scenes, subs_all, rows = [], [], []
    for i, sc in enumerate(scenes):
        t0, t1 = starts[i], (starts[i + 1] if i + 1 < len(scenes) else dur)
        subs = place_subs(sc, t0, t1, warns.append)
        ev = resolve_events(sc, t0, t1, subs, grid, fps, warns.append, out)
        f0 = frame_of(t0, fps)
        f1 = frame_of(t1, fps) if i + 1 < len(scenes) else n_frames
        anchored = i in fixed and i > 0
        nxt_f = frame_of(starts[i + 1], fps) if i + 1 < len(scenes) else n_frames
        trans, c0, c1 = T.resolve(i, sc, f0, tl_scenes[-1] if tl_scenes else None, nxt_f, fps, warns.append, out)
        last = i + 1 == len(scenes)
        tl_scenes.append({"id": sc["id"], "type": sc.get("type", sc["id"]), "from": f0, "dur": f1 - f0,
                          "props": sc.get("props", {}), "events": ev,
                          "subs": [{"in": round(s["t0"] * fps) - f0, "out": round(s["t1"] * fps) - f0} for s in subs],
                          "fadeIn": sc.get("fadeIn", 0.0), "fadeOut": sc.get("fadeOut", 1.2 if last else 0.0),
                          "cam0": c0, "cam1": c1, "in": trans})
        subs_all += subs
        rows.append(f"  {sc['id']:<14} {sc.get('type', sc['id']):<13} {t0:7.2f}-{t1:7.2f}s  ({t1 - t0:5.1f}s，内容需 "
                    f"{need[i]:4.1f}s)  in={trans['type'] if trans else '-':<6} {'anchor=' + str(sc['anchor']) if anchored else ''}")

    for k, s in enumerate(subs_all):
        shown = s["t1"] - s["t0"]
        if shown < s["need"] - 0.05:
            warns.append(f"字幕「{s['zh']}」只停 {shown:.2f}s，公式要求 ≥ {s['need']:.2f}s")
        if zh_len(s["zh"]) > MAX_ZH:
            warns.append(f"字幕「{s['zh']}」{zh_len(s['zh'])} 字，超过 {MAX_ZH} 字")
        if k:
            p = subs_all[k - 1]
            gap = s["t0"] - p["t1"]
            if gap < (0.5 if p["scene"] == s["scene"] else 1.2):
                warns.append(f"字幕「{p['zh']}」→「{s['zh']}」间隔只有 {gap:.2f}s")
    bad = [c for c in out["checks"] if c["snap"] not in ("none", "frame") and abs(c["dev"]) > 1]
    seen = set()
    for c in out["checks"]:  # beat-level snaps should move < half a beat; a big move means the grid isn't what you think
        if c["snap"] in ("beat", "half", "quarter") and abs(c["shift"]) > max(0.6, grid.period) and c["cue"] not in seen:
            seen.add(c["cue"])
            warns.append(f"{c['cue']} 为了卡 {c['snap']} 被挪了 {c['shift']:+.2f}s，确认画面意图还对")
    per_min = len(subs_all) / (dur / 60)
    if not 5 <= per_min <= 11:
        warns.append(f"字幕密度 {per_min:.1f} 条/分钟（建议 8–10 条/分钟）")

    tl = {"fps": fps, "width": meta.get("width", 1920), "height": meta.get("height", 1080), "frames": n_frames,
          "duration": dur, "meta": meta, "glyphs": "".join(sorted(glyphs(sb, set()))),
          "bgm": {"bpm": b["bpm"], "key": b["key"], "source": b.get("source")},
          "beats": [frame_of(t, fps) for t in b["beats"]], "downbeats": [frame_of(t, fps) for t in b["downbeats"]],
          "hits": {k: frame_of(v, fps) for k, v in b.get("hits", {}).items()}, "scenes": tl_scenes,
          "subs": [{"zh": s["zh"], "en": s["en"], "from": round(s["t0"] * fps), "to": round(s["t1"] * fps)} for s in subs_all],
          "flashes": out["flashes"], "shakes": out["shakes"], "cues": sorted(out["cues"], key=lambda c: c["f"])}
    save_json(ROOT / "src" / "data" / "timeline.json", tl, indent=None)
    save_json(ROOT / "out" / "sync_checks.json", {"checks": out["checks"], "sfx": out["sfx"], "ducks": out["ducks"]})

    rep = [f"时长 {dur:.2f}s = {n_frames} 帧 @ {fps}fps · BGM {b.get('source')} {b['bpm']} BPM {b['key']}",
           "叙事锚点：" + ", ".join(f"{k} {v:.2f}s" for k, v in b.get("hits", {}).items()), "场景：", *rows,
           f"字幕 {len(subs_all)} 条（{per_min:.1f} 条/分钟）· 卡点事件 {len(out['checks'])} 个，偏差 >1 帧 {len(bad)} 个"]
    if not a.no_audio:
        rep += M.mix(ROOT / b.get("file", "analysis/bgm.wav"), n_frames, fps, out["sfx"], out["ducks"], b["key"],
                     ROOT / "public" / "audio" / "mix.wav", meta.get("sfxGain", 0.0), a.stems, meta.get("autoDuck", True))
    rep += [f"[FAIL] {c['cue']} 帧 {c['f']} 偏离目标 {c['dev']:+.2f} 帧" for c in bad]
    rep += [f"[warn] {w}" for w in warns]
    rep.append(f"→ src/data/timeline.json{'' if a.no_audio else ', public/audio/mix.wav'}；警告 {len(warns)} 条，失败 {len(bad)} 条")
    text = "\n".join(rep)
    (ROOT / "out").mkdir(exist_ok=True)
    (ROOT / "out" / "build_report.txt").write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
