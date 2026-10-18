"""Post-render checks -> out/qc.txt + out/contact_sheet.jpg (one frame every 10 s; LOOK at it).
usage: python tools/qc.py [--video out/final.mp4] [--every 10]"""
import argparse
import json

import numpy as np
from scipy import signal

from common import ROOT, active_rms, db, die, load_json, read_wav, run_ff, utf8_stdout
from layout import hold_of


def probe(v):
    o = json.loads(run_ff(["-v", "error", "-show_streams", "-show_format", "-of", "json", v], "ffprobe"))
    vs = next(s for s in o["streams"] if s["codec_type"] == "video")
    au = [s for s in o["streams"] if s["codec_type"] == "audio"]
    n, d = map(int, vs["r_frame_rate"].split("/"))
    return {"w": vs["width"], "h": vs["height"], "fps": n / d, "dur": float(o["format"]["duration"]),
            "frames": int(vs.get("nb_frames", 0)), "audio": au[0]["codec_name"] if au else None,
            "vcodec": vs["codec_name"]}


def sheet(v, tl, every, out):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return "没装 Pillow，跳过 contact sheet（pip install pillow）"
    tmp = ROOT / ".cache" / "qc"
    tmp.mkdir(parents=True, exist_ok=True)
    times = np.arange(every / 2, tl["duration"] - 0.5, every)
    tiles = []
    for k, t in enumerate(times):
        p = tmp / f"f{k:03d}.png"
        run_ff(["-y", "-ss", f"{t:.3f}", "-i", v, "-frames:v", "1", "-vf", "scale=640:-2", p])
        im = Image.open(p).convert("RGB")
        f = int(t * tl["fps"])
        sc = next((s["id"] for s in tl["scenes"] if s["from"] <= f < s["from"] + s["dur"]), "")
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 640, 22], fill=(0, 0, 0))
        d.text((6, 5), f"{t:6.1f}s  f{f}  {sc}", fill=(160, 230, 255))
        tiles.append(im)
    cols = 4
    rows = (len(tiles) + cols - 1) // cols
    W, H = tiles[0].size
    S = Image.new("RGB", (cols * W + (cols + 1) * 6, rows * H + (rows + 1) * 6), (40, 40, 40))
    for i, im in enumerate(tiles):
        S.paste(im, (6 + (i % cols) * (W + 6), 6 + (i // cols) * (H + 6)))
    S.save(out, quality=90)
    for p in tmp.glob("*.png"):
        p.unlink()
    return f"contact sheet {len(tiles)} 帧 → {out.relative_to(ROOT)}"


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", default="out/final.mp4")
    ap.add_argument("--every", type=float, default=10)
    a = ap.parse_args()
    v = ROOT / a.video
    if not v.exists():
        die(f"没有 {a.video}")
    tl = load_json(ROOT / "src" / "data" / "timeline.json")
    beats = load_json(ROOT / "analysis" / "beats.json")
    fps, res, fail = tl["fps"], [], 0

    def check(ok, msg):
        nonlocal fail
        fail += not ok
        res.append(f"[{'PASS' if ok else 'FAIL'}] {msg}")

    p = probe(v)
    check((p["w"], p["h"]) == (tl["width"], tl["height"]), f"分辨率 {p['w']}×{p['h']}")
    check(abs(p["fps"] - fps) < 0.01, f"帧率 {p['fps']:.3f}")
    check(abs(p["dur"] - beats["duration"]) <= 1.5 / fps, f"时长 {p['dur']:.3f}s，BGM {beats['duration']:.3f}s（±1 帧）")
    check(p["audio"] == "aac" and p["vcodec"] == "h264", f"编码 {p['vcodec']} + {p['audio']}")
    wav = ROOT / ".cache" / "qc_audio.wav"
    run_ff(["-y", "-i", v, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", wav])
    sr, x = read_wav(wav)
    tp, n, o = 0.0, 10 * sr, 2048  # 4x-oversampled true peak, in chunks to keep memory flat
    for c in range(2):
        for i in range(0, len(x), n):
            lo = max(0, i - o)
            y = signal.resample_poly(x[lo:i + n + o, c], 4, 1)
            tp = max(tp, float(np.abs(y[4 * (i - lo):4 * (i - lo + n)]).max()))
    check(db(tp) <= -1.0, f"峰值（4× 过采样 true peak）{db(tp):.2f} dBFS ≤ -1；有效 RMS {db(active_rms(x.mean(1), sr)):.1f} dBFS")
    wav.unlink()
    sc = load_json(ROOT / "out" / "sync_checks.json")["checks"]
    bad = [c for c in sc if c["snap"] not in ("none", "frame") and abs(c["dev"]) > 1]
    check(not bad, f"卡点：{len(sc)} 个事件，偏离拍点 >1 帧 {len(bad)} 个" + "".join(f"\n       {c['cue']} f{c['f']} {c['dev']:+.2f}" for c in bad))
    short = [s for s in tl["subs"] if (s["to"] - s["from"]) / fps < hold_of(s) - 0.05]
    check(not short, f"字幕：{len(tl['subs'])} 条，停留不足公式 {len(short)} 条" + "".join(f"\n       「{s['zh']}」" for s in short))
    res.append(sheet(v, tl, a.every, ROOT / "out" / "contact_sheet.jpg"))
    res.append("人工检查（看 contact sheet）：文字出画/重叠？每屏强调色 ≤ 2 种？字幕和主体打架？中文是不是细宋体（不是黑体）？")
    text = "\n".join(res) + f"\n{'全部通过' if not fail else f'{fail} 项失败'}"
    (ROOT / "out" / "qc.txt").write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
