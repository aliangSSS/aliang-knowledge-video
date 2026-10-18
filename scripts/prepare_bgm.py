"""Convert the BGM (default: the bundled assets/bgm/default.mp3), optionally fit it to a target length on bar lines,
analyse it. usage: python tools/prepare_bgm.py [music file] [--target SECONDS]
writes analysis/bgm.wav (48 kHz stereo), analysis/beats.json, analysis/bgm_map.png"""
import argparse
from pathlib import Path

import numpy as np
from scipy import signal

from analyze import analyze, plot_map, summary
from common import ROOT, read_wav, save_json, to_wav, utf8_stdout, write_wav


def bar_feats(x, sr, downs):
    f, t, Z = signal.stft(x, sr, nperseg=4096, noverlap=4096 - 1024, boundary=None, padded=False)
    S = np.abs(Z)
    pc = (np.round(12 * np.log2(np.maximum(f, 1) / 440.0)) % 12).astype(int)
    sel = (f > 60) & (f < 5000)
    edges = np.searchsorted(f, np.geomspace(40, 12000, 13))
    out = []
    for a, b in zip(downs[:-1], downs[1:]):
        s = S[:, (t >= a) & (t < b)]
        if s.shape[1] == 0:
            out.append(np.zeros(24))
            continue
        ch = np.array([s[sel & (pc == k)].sum() for k in range(12)])
        be = np.log1p(np.array([s[i:j].sum() for i, j in zip(edges[:-1], edges[1:])]))
        out.append(np.concatenate([ch / (np.linalg.norm(ch) + 1e-9), be / (np.linalg.norm(be) + 1e-9)]))
    return np.array(out)


def fit(st, sr, b, target):
    """Cut (or repeat) a middle stretch so that out = st[:p] + st[q:], q - p = dur - target, p and q on downbeats."""
    dur = len(st) / sr
    shift = dur - target
    downs = np.array(b["downbeats"])
    if len(downs) < 8:
        print("[warn] 小节线太少，不做时长适配")
        return st, None
    F = bar_feats(st.mean(1), sr, downs)
    bar = float(np.median(np.diff(downs)))
    best = None
    for i in range(1, len(downs) - 1):
        p = downs[i]
        if not (0.15 * dur < p < 0.85 * dur):
            continue
        for j in range(1, len(downs) - 1):
            q = downs[j]
            if j == i or abs((q - p) - shift) > bar * 0.75 or not (0.1 * dur < q < 0.9 * dur):
                continue
            s = 0.5 * (F[i] @ F[j]) + 0.5 * (F[i - 1] @ F[j - 1])
            if best is None or s > best[0]:
                best = (s, p, q)
    if best is None:
        print(f"[warn] 找不到合适的跳点（差 {shift:+.1f}s），保持原长")
        return st, None
    s, p, q = best
    ip, iq, n = int(p * sr), int(q * sr), int(0.05 * sr)
    head, tail = st[:ip].copy(), st[iq:]
    th = np.linspace(0, np.pi / 2, n)[:, None]
    head[-n:] = head[-n:] * np.cos(th) + st[iq - n:iq] * np.sin(th)
    out = np.concatenate([head, tail])
    info = {"cut_at": round(p, 3), "resume_from": round(q, 3), "similarity": round(float(s), 3),
            "original_duration": round(dur, 3), "duration": round(len(out) / sr, 3)}
    print(f"时长适配：在 {p:.2f}s 处接到原曲 {q:.2f}s（相似度 {s:.2f}），{dur:.1f}s → {len(out)/sr:.1f}s")
    return out, info


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", help="音乐文件；省略 = 默认 BGM（assets/bgm/default.mp3）")
    ap.add_argument("--target", type=float, help="目标时长（秒）；与原长相差 3%% 以内不改")
    a = ap.parse_args()
    if not a.src:
        cands = [ROOT / "assets" / "bgm" / "default.mp3", Path(__file__).resolve().parent.parent / "assets" / "bgm" / "default.mp3"]
        a.src = next((str(c) for c in cands if c.exists()), None)
        if not a.src:
            raise SystemExit("[error] 找不到默认 BGM assets/bgm/default.mp3")
        print(f"使用默认 BGM：{a.src}")
    wav = ROOT / "analysis" / "bgm.wav"
    to_wav(a.src, wav)
    sr, st = read_wav(wav)
    b = analyze(st, sr)
    info = None
    if a.target and abs(b["duration"] - a.target) > 0.03 * a.target:
        st, info = fit(st, sr, b, a.target)
        if info:
            write_wav(wav, sr, st)
            b = analyze(st, sr)
    plot_map(b, ROOT / "analysis" / "bgm_map.png")
    b.pop("_plot")
    b["file"] = "analysis/bgm.wav"
    b["src"] = str(a.src)
    if info:
        b["fit"] = info
    save_json(ROOT / "analysis" / "beats.json", b)
    print(summary(b))
    print("→ analysis/beats.json, analysis/bgm_map.png, analysis/bgm.wav")


if __name__ == "__main__":
    main()
