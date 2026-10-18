"""Shared helpers for the aliang-knowledge-video tools: ffmpeg lookup, wav IO, levels, scales.
Only numpy + scipy. Every tool runs from the project root (the folder with storyboard.json)."""
import glob
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

SR = 48000
FPS = 30
ROOT = Path.cwd()


def utf8_stdout():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass


def die(msg):
    print(f"[error] {msg}", file=sys.stderr)
    sys.exit(1)


def find_ff(name="ffmpeg"):
    """System ffmpeg/ffprobe, else the copy that ships with Remotion's compositor package."""
    env = os.environ.get(name.upper())
    if env and Path(env).exists():
        return env
    hit = shutil.which(name)
    if hit:
        return hit
    exe = name + (".exe" if os.name == "nt" else "")
    for d in [ROOT, *ROOT.parents][:4]:
        hits = glob.glob(str(d / "node_modules" / "@remotion" / "compositor-*" / exe))
        if hits:
            return hits[0]
    die(f"找不到 {name}。先在项目里 npm install（Remotion 自带），或安装系统 ffmpeg，或设置环境变量 {name.upper()}")


def run_ff(args, name="ffmpeg"):
    exe = find_ff(name)
    env = dict(os.environ)
    d = str(Path(exe).parent)
    for k in ("LD_LIBRARY_PATH", "DYLD_LIBRARY_PATH"):
        env[k] = d + os.pathsep + env.get(k, "")
    r = subprocess.run([exe, "-hide_banner", "-loglevel", "error", *map(str, args)], env=env,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        die(f"{name} 失败：{r.stderr[-1000:]}")
    return r.stdout


def to_wav(src, dst, sr=SR, ch=2):
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    run_ff(["-y", "-i", src, "-vn", "-ac", ch, "-ar", sr, "-c:a", "pcm_s16le", dst])


def read_wav(p):
    sr, x = wavfile.read(str(p))
    if x.dtype == np.int16:
        x = x.astype(np.float32) / 32768
    elif x.dtype == np.int32:
        x = x.astype(np.float32) / 2147483648
    else:
        x = x.astype(np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    return sr, x[:, :2]


def write_wav(p, sr, x):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(str(p), sr, (np.clip(x, -1, 1) * 32767).astype(np.int16))


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-9))


def undb(d):
    return 10 ** (np.asarray(d, dtype=np.float64) / 20)


def active_rms(mono, sr, win=0.4, gate_db=-50):
    """RMS over the blocks louder than the gate, so pauses don't drag the level down."""
    n = max(1, int(win * sr))
    blocks = mono[: len(mono) // n * n].reshape(-1, n)
    if not len(blocks):
        return float(np.sqrt(np.mean(mono ** 2) + 1e-12))
    r = np.sqrt((blocks.astype(np.float64) ** 2).mean(1) + 1e-12)
    keep = r[db(r) > gate_db]
    return float(np.sqrt((keep ** 2).mean())) if len(keep) else 1e-9


def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_json(p, d, indent=1):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=indent)


NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
        "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi_hz(m):
    return 440.0 * 2 ** ((np.asarray(m, dtype=np.float64) - 69) / 12)


def pentatonic(key="C major", lo=72, hi=96):
    """MIDI notes of the key's pentatonic scale in [lo, hi]. Minor keys use the minor pentatonic."""
    tonic, mode = (key.split() + ["major"])[:2]
    t = NOTE.get(tonic, 0)
    steps = [0, 2, 4, 7, 9] if mode.startswith("maj") else [0, 3, 5, 7, 10]
    pcs = {(t + s) % 12 for s in steps}
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]
