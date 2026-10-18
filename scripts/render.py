"""Render out/final.mp4 and out/debug.mp4 (half size, frame/beat/cue overlay). All temp files stay in .cache/.
usage: python tools/render.py [--only main|debug] [--frames 0-299] [--concurrency N]"""
import argparse
import os
import shutil
import subprocess
import sys

from common import ROOT, die, utf8_stdout


def env():
    tmp = ROOT / ".cache" / "tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    e = dict(os.environ)
    for k in ("TMP", "TEMP", "TMPDIR"):
        e[k] = str(tmp)
    e.setdefault("npm_config_cache", str(ROOT / ".cache" / "npm"))
    return e


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["main", "debug"])
    ap.add_argument("--frames", help="例如 0-299，只渲染一段做测试")
    ap.add_argument("--concurrency", type=int)
    a = ap.parse_args()
    tl, sb, mixw = ROOT / "src" / "data" / "timeline.json", ROOT / "storyboard.json", ROOT / "public" / "audio" / "mix.wav"
    if not mixw.exists():
        die("没有 public/audio/mix.wav：先跑 python tools/build.py")
    if sb.exists() and sb.stat().st_mtime > tl.stat().st_mtime:
        die("storyboard.json 比 timeline.json 新：先重跑 python tools/build.py")
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        die("找不到 npx（需要 Node.js 18+）")
    jobs = [("Main", "out/final.mp4", []), ("Debug", "out/debug.mp4", ["--scale=0.5"])]
    if a.only:
        jobs = [j for j in jobs if j[0].lower() == a.only]
    for comp, out, extra in jobs:
        cmd = [npx, "remotion", "render", comp, out, "--log=info", *extra]
        if a.frames:
            cmd.append(f"--frames={a.frames}")
        # Remotion's default (half the cores) runs out of RAM on world-heavy films; 3 tabs is safe on 8–16 GB machines
        cmd.append(f"--concurrency={a.concurrency or 3}")
        print(">", " ".join(cmd[1:]), flush=True)
        r = subprocess.run(cmd, cwd=ROOT, env=env())
        if r.returncode:
            sys.exit(r.returncode)
    shutil.rmtree(ROOT / ".cache" / "tmp", ignore_errors=True)
    print("→ " + ", ".join(j[1] for j in jobs) + "；接着跑 python tools/qc.py")


if __name__ == "__main__":
    main()
