"""Create a video project from the skill template and install it. Everything (node_modules, caches, temp files,
renders) stays inside the project folder.
usage: python <skill>/scripts/new_project.py <project dir> [--no-install] [--venv] [--force]
env:   VKV_CACHE=<dir>  share one npm/pip cache between projects (default <project>/.cache)"""
import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
IGNORE = shutil.ignore_patterns("node_modules", "__pycache__", "*.pyc", ".cache", "out", "new_project.py")


def fill_missing(src, dst):
    """Copy template files that don't exist yet; never overwrite the user's scenes / storyboard / data."""
    for f in src.rglob("*"):
        rel = f.relative_to(src)
        if f.is_dir() or any(p in ("node_modules", "__pycache__") for p in rel.parts):
            continue
        t = dst / rel
        if not t.exists():
            t.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, t)


def remotion_version(d):
    try:
        return json.loads((d / "node_modules" / "remotion" / "package.json").read_text(encoding="utf-8"))["version"]
    except Exception:
        return None


def reuse_browser(dest):
    """Copy Chrome Headless Shell (~270 MB download) from a sibling project on the same Remotion version."""
    target = dest / "node_modules" / ".remotion" / "chrome-headless-shell"
    if target.exists():
        return
    want = remotion_version(dest)
    cands = [Path(p) for p in os.environ.get("VKV_BROWSER_FROM", "").split(os.pathsep) if p]
    cands += [p for p in dest.parent.iterdir() if p.is_dir() and p != dest]
    for c in cands:
        src = c / "node_modules" / ".remotion" / "chrome-headless-shell"
        if src.exists() and remotion_version(c) == want:
            print(f"复用 {c.name} 里的 Chrome Headless Shell（同为 Remotion {want}）")
            shutil.copytree(src, target)
            return


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument("dest")
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--venv", action="store_true", help="缺 Python 包时在项目里建 .venv 安装")
    ap.add_argument("--force", action="store_true", help="目录非空也继续（只补缺失的模板文件，不覆盖已有文件）")
    a = ap.parse_args()
    dest = Path(a.dest).resolve()
    existing = (dest / "storyboard.json").exists() or (dest / "src" / "scenes").exists()
    if dest.exists() and any(dest.iterdir()) and not a.force and not existing:
        sys.exit(f"[error] {dest} 不是空目录；确认可以写入就加 --force")
    if existing or (dest.exists() and any(dest.iterdir())):
        fill_missing(SKILL / "template", dest)  # re-run on a project: refresh tools/ + engine, keep the user's files
        for sub in ("lib", "components"):  # engine files are the skill's, the film's own files (scenes, World) stay
            shutil.copytree(SKILL / "template" / "src" / sub, dest / "src" / sub, dirs_exist_ok=True)
        for fn in ("Video.tsx", "Root.tsx", "index.ts"):
            shutil.copy2(SKILL / "template" / "src" / fn, dest / "src" / fn)
    else:
        shutil.copytree(SKILL / "template", dest, dirs_exist_ok=True, ignore=IGNORE)
    shutil.copytree(SKILL / "scripts", dest / "tools", dirs_exist_ok=True, ignore=IGNORE)
    shutil.copytree(SKILL / "assets", dest / "assets", dirs_exist_ok=True)  # default BGM + CC0 foley
    for d in ("analysis", "out", "notes", "public/audio", ".cache"):
        (dest / d).mkdir(parents=True, exist_ok=True)
    (dest / ".gitignore").write_text("node_modules/\n.cache/\n.venv/\nout/*.mp4\n__pycache__/\n", encoding="utf-8")
    cache = Path(os.environ.get("VKV_CACHE") or dest / ".cache")
    env = dict(os.environ, npm_config_cache=str(cache / "npm"), PIP_CACHE_DIR=str(cache / "pip"),
               TMP=str(dest / ".cache"), TEMP=str(dest / ".cache"), TMPDIR=str(dest / ".cache"))

    py = sys.executable
    missing = [m for m in ("numpy", "scipy", "matplotlib", "PIL") if importlib.util.find_spec(m) is None]
    if missing and a.venv:
        subprocess.run([sys.executable, "-m", "venv", str(dest / ".venv")], check=True, env=env)
        py = str(dest / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python"))
        subprocess.run([py, "-m", "pip", "install", "-q", "numpy", "scipy", "matplotlib", "pillow"], check=True, env=env)
        missing = []
    if missing:
        print(f"[warn] 缺 Python 包：{', '.join(missing)}。加 --venv 自动装进项目，或 pip install numpy scipy matplotlib pillow")

    if not a.no_install:
        npm = shutil.which("npm") or shutil.which("npm.cmd")
        if not npm:
            sys.exit("[error] 找不到 npm（需要 Node.js 18+）")
        print("npm install …（国内网络慢可先 npm config set registry https://registry.npmmirror.com）", flush=True)
        r = subprocess.run([npm, "install", "--no-audit", "--no-fund", "--loglevel=error"], cwd=dest, env=env)
        if r.returncode:
            sys.exit("[error] npm install 失败")
        reuse_browser(dest)
    print(f"项目已建好：{dest}\nPY={py}\n下一步：cd 到项目目录，跑 tools/prepare_bgm.py（默认 BGM）或 tools/prepare_bgm.py <音乐文件>")


if __name__ == "__main__":
    main()
