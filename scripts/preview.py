"""Render chosen frames (or one per scene) as stills and tile them -> out/preview.jpg. Much faster than a full render;
use it after every scene edit. usage: python tools/preview.py --scenes | python tools/preview.py 120 360 1500"""
import argparse
import os
import shutil
import subprocess

from common import ROOT, die, load_json, utf8_stdout


def pick(tl):
    """One frame per scene, after its last event has settled, before the fade-out."""
    out = []
    for s in tl["scenes"]:
        evs = [e["f"] for e in s["events"].values()] + [x for e in s["events"].values() for x in e["fs"]]
        last = max(evs) if evs else 0
        f = min(s["dur"] - int(s["fadeOut"] * tl["fps"]) - 3, max(last + 40, s["dur"] // 2))
        out.append(s["from"] + max(0, f))
    return out


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser()
    ap.add_argument("frames", nargs="*", type=int)
    ap.add_argument("--scenes", action="store_true", help="每个场景挑一帧")
    ap.add_argument("--scale", type=float, default=0.5)
    a = ap.parse_args()
    tl = load_json(ROOT / "src" / "data" / "timeline.json")
    frames = sorted(set(a.frames + (pick(tl) if a.scenes or not a.frames else [])))
    if not (ROOT / "public" / "audio" / "mix.wav").exists():
        die("没有 public/audio/mix.wav：先跑 python tools/build.py")
    d = ROOT / ".cache" / "preview"
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    tmp = ROOT / ".cache" / "tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, TMP=str(tmp), TEMP=str(tmp), TMPDIR=str(tmp))
    node = shutil.which("node") or die("找不到 node")
    r = subprocess.run([node, "tools/stills.mjs", str(d), str(a.scale), *map(str, frames)], cwd=ROOT, env=env)
    if r.returncode:
        die("渲染静帧失败（看上面的报错）")
    from PIL import Image, ImageDraw
    ims = [Image.open(p).convert("RGB") for p in sorted(d.glob("still_*.png"))]
    W, H = ims[0].size
    cols = 3 if len(ims) > 4 else 2
    rows = (len(ims) + cols - 1) // cols
    S = Image.new("RGB", (cols * W + (cols + 1) * 6, rows * H + (rows + 1) * 6), (40, 40, 40))
    for i, (im, f) in enumerate(zip(ims, frames)):
        sc = next((s["id"] for s in tl["scenes"] if s["from"] <= f < s["from"] + s["dur"]), "")
        ImageDraw.Draw(im).text((8, 6), f"f{f}  {f / tl['fps']:.2f}s  {sc}", fill=(160, 230, 255))
        S.paste(im, (6 + (i % cols) * (W + 6), 6 + (i // cols) * (H + 6)))
    S.save(ROOT / "out" / "preview.jpg", quality=88)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"→ out/preview.jpg（{len(ims)} 帧：{frames}）")


if __name__ == "__main__":
    main()
