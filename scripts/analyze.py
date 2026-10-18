"""BGM analysis: tempo, beats, downbeats, accents, sections, silences, energy, key, narrative hits."""
import numpy as np
from scipy import ndimage, signal

from common import db

A_SR, HOP = 22050, 256
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def _onset(x, sr):
    f, t, Z = signal.stft(x, sr, nperseg=2048, noverlap=2048 - HOP, boundary=None, padded=False)
    S = np.abs(Z)
    idx = np.searchsorted(f, np.geomspace(40, 10000, 41))
    bands = np.stack([S[a:b].sum(0) for a, b in zip(idx[:-1], idx[1:])])
    L = np.log1p(1000 * bands)
    flux = np.concatenate([[0], np.maximum(0, np.diff(L, axis=1)).sum(0)])
    hp = np.maximum(0, flux - signal.medfilt(flux, 31))
    low = np.concatenate([[0], np.maximum(0, np.diff(L[:8], axis=1)).sum(0)])
    return f, t, S, bands, hp / (hp.max() + 1e-9), low


def _tempo(on, fps):
    o = on - on.mean()
    ac = signal.fftconvolve(o, o[::-1], "full")[len(o) - 1:]
    lag = np.arange(1, len(ac))
    bpm = 60 * fps / lag
    m = (bpm > 55) & (bpm < 190)
    sc = ac[1:][m] * np.exp(-0.5 * (np.log2(bpm[m] / 100) / 0.9) ** 2)
    i = int(np.argmax(sc))
    return float(bpm[m][i]), float(ac[1:][m][i] / (ac[0] + 1e-9))


def _track(on, fps, bpm, tight=100.0):
    """Dynamic-programming beat tracker (Ellis 2007)."""
    period = fps * 60 / bpm
    n = len(on)
    cum, back = on.astype(np.float64).copy(), np.full(n, -1)
    offs = np.arange(int(round(period / 2)), int(round(period * 2)) + 1)
    pen = -tight * np.log(offs / period) ** 2
    for i in range(offs[0], n):
        prev = i - offs
        ok = prev >= 0
        sc = cum[prev[ok]] + pen[ok]
        j = int(np.argmax(sc))
        cum[i], back[i] = on[i] + sc[j], prev[ok][j]
    tail = np.arange(max(0, n - int(period)), n)
    i, out = int(tail[np.argmax(cum[tail])]), []
    while i >= 0:
        out.append(i)
        i = back[i]
    return np.array(out[::-1])


def _sections(bands, fps, edb, dur):
    n = int(bands.shape[1] / (fps * 0.5))
    feat = np.log1p(1000 * np.stack([bands[:, int(i * fps * .5):int((i + 1) * fps * .5)].mean(1) for i in range(n)]).T)
    feat = (feat - feat.mean(1, keepdims=True)) / (feat.std(1, keepdims=True) + 1e-9)
    K, nov = 8, np.zeros(n)
    for i in range(K, n - K):
        nov[i] = np.linalg.norm(feat[:, i:i + K].mean(1) - feat[:, i - K:i].mean(1))
    pk, _ = signal.find_peaks(nov, distance=12, height=np.percentile(nov, 75))
    b = [0.0] + [i * 0.5 for i in pk] + [dur]
    lv = [float(np.mean(edb[int(a * 2):max(int(a * 2) + 1, int(c * 2))])) for a, c in zip(b[:-1], b[1:])]
    med, out = float(np.median(lv)), []
    for k, (a, c) in enumerate(zip(b[:-1], b[1:])):
        e = lv[k]
        nxt = lv[k + 1] if k + 1 < len(lv) else e
        lab = ("intro" if k == 0 else "outro" if k == len(lv) - 1 else "drop" if e >= med + 2
               else "break" if e <= med - 4 else "build" if nxt >= e + 2 else "flow")
        out.append({"t0": round(a, 2), "t1": round(c, 2), "label": lab, "db": round(e, 1)})
    return out


def _silences(x, sr, dur):
    w = int(0.05 * sr)
    env = db(np.sqrt(np.convolve(x ** 2, np.ones(w) / w, "same")[::w] + 1e-12))
    low = (env < ndimage.median_filter(env, 81) - 12) | (env < -50)
    out, i = [], 0
    while i < len(low):
        if low[i]:
            j = i
            while j < len(low) and low[j]:
                j += 1
            t0, t1 = i * 0.05, j * 0.05
            if j - i >= 5 and t0 > 1.0 and t1 < dur - 2.0:
                out.append({"t0": round(t0, 2), "t1": round(t1, 2), "depth": round(float(env[i:j].min()), 1)})
            i = j
        i += 1
    return out


def _key(f, S):
    fr = f[1:]
    pc = (np.round(12 * np.log2(np.maximum(fr, 1) / 440.0) + 69) % 12).astype(int)
    sm, sel = S[1:].mean(1), (fr > 80) & (fr < 4000)
    ch = np.array([sm[sel & (pc == k)].sum() for k in range(12)])
    best = max(((np.corrcoef(np.roll(p, k), ch)[0, 1], f"{NAMES[k]} {m}") for k in range(12)
                for m, p in (("major", MAJ), ("minor", MIN))))
    return best[1]


def pick_hits(dur, accents, downbeats, silences, energy):
    """Narrative anchors: title (~8%, ≥13 s), reveal (~55%), twist (~68%), end title (last chord, ≥4 s of tail).
    A good hit is where the music ARRIVES: a strong accent, energy rising after it, ideally right after a dip."""
    E = np.array(energy, float)
    strong = [a for a in accents if a["s"] >= 0.3] or accents

    def rise(t):
        i = int(t * 2)
        return float(E[i:i + 4].mean() - E[max(0, i - 4):i].mean()) if 0 < i < len(E) - 1 else 0.0

    def after_dip(t):
        return any(s["t0"] - 0.2 <= t <= s["t1"] + 0.8 for s in silences)

    def best(frac, w, lo, hi):
        c = [a for a in strong if lo < a["t"] < hi]
        if not c:
            return float(np.clip(frac * dur, lo + 1, hi - 1))
        sc = [a["s"] * np.exp(-0.5 * ((a["t"] - frac * dur) / (w * dur)) ** 2) * (1 + np.clip(rise(a["t"]) / 8, 0, 1))
              * (3.0 if after_dip(a["t"]) else 1.0) for a in c]  # the track's own vacuum → hit is the best reveal
        return c[int(np.argmax(sc))]["t"]

    title = best(max(0.08, 13 / dur), 0.04, 2, 0.3 * dur)
    reveal = best(0.55, 0.08, title + 8, 0.7 * dur)
    twist = best(0.68, 0.08, reveal + 6, 0.85 * dur)
    tail = [a for a in accents if max(twist + 6, 0.85 * dur) < a["t"] < dur - 4]
    if tail:  # latest strong-enough accent before the fade
        top = max(a["s"] for a in tail)
        end = [a for a in tail if a["s"] >= 0.5 * top][-1]["t"]
    else:
        dbs = np.array(downbeats) if len(downbeats) else np.array([dur - 5])
        end = float(dbs[np.argmin(np.abs(dbs - min(0.96 * dur, dur - 4)))])
    return {"title": round(title, 3), "reveal": round(reveal, 3), "twist": round(twist, 3), "end": round(end, 3)}


def analyze(stereo, sr):
    x = stereo.mean(1).astype(np.float32)  # float32 keeps the STFT of a 5-min track well under 1 GB
    if sr != A_SR:
        x = signal.resample_poly(x, A_SR, sr)
    dur = len(x) / A_SR
    fps = A_SR / HOP
    f, t, S, bands, on, low = _onset(x, A_SR)
    bpm, conf = _tempo(on, fps)
    bi = _track(on, fps, bpm)
    beats = t[bi]
    ph = int(np.argmax([low[bi[p::4]].mean() + 0.5 * on[bi[p::4]].mean() for p in range(4)])) if len(bi) >= 8 else 0
    downs = beats[ph::4]
    pk, _ = signal.find_peaks(on, distance=int(0.25 * fps), height=0.12)
    accents = [{"t": round(float(t[p]), 3), "s": round(float(on[p]), 3)} for p in pk]
    h = A_SR // 2
    edb = db(np.array([np.sqrt(np.mean(x[i:i + h] ** 2) + 1e-12) for i in range(0, len(x), h)]))
    sil = _silences(x, A_SR, dur)
    out = {
        "source": "analyzed", "duration": round(dur, 3), "bpm": round(bpm, 2), "tempo_conf": round(conf, 3),
        "ambient": bool(conf < 0.25), "beats": [round(float(v), 3) for v in beats],
        "downbeats": [round(float(v), 3) for v in downs], "accents": accents,
        "sections": _sections(bands, fps, edb, dur), "silences": sil,
        "energy": [round(float(v), 1) for v in edb], "key": _key(f, S),
    }
    out["hits"] = pick_hits(dur, accents, out["downbeats"], sil, out["energy"])
    out["_plot"] = (x, A_SR, t, on)
    return out


def summary(b):
    lines = [f"时长 {b['duration']:.1f}s · {b['bpm']:.1f} BPM（置信度 {b.get('tempo_conf', 1):.2f}"
             f"{'，节拍不明显，按 accent/段落卡点' if b.get('ambient') else ''}）· 调性 {b['key']}",
             "段落：" + " / ".join(f"{s['label']} {s['t0']:.0f}-{s['t1']:.0f}s" for s in b["sections"]),
             "真空/低谷：" + (", ".join(f"{s['t0']:.1f}-{s['t1']:.1f}s" for s in b["silences"]) or "无"),
             "最强重音：" + ", ".join(f"{a['t']:.1f}s({a['s']:.2f})" for a in sorted(b["accents"], key=lambda a: -a["s"])[:6]),
             "叙事锚点：" + ", ".join(f"{k}={v:.2f}s" for k, v in b["hits"].items())]
    return "\n".join(lines)


def plot_map(b, png):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("[warn] 没装 matplotlib，跳过 bgm_map.png")
        return
    x, sr, t, on = b["_plot"]
    fig, ax = plt.subplots(3, 1, figsize=(22, 9), sharex=True, gridspec_kw={"height_ratios": [3, 1, 1]})
    fd, td, Zd = signal.stft(x, sr, nperseg=2048, noverlap=1024)
    ax[0].pcolormesh(td, fd, db(np.abs(Zd)), vmin=-90, vmax=-15, shading="auto", cmap="magma")
    ax[0].set_ylim(0, 8000)
    ax[1].plot(t, on, lw=0.4, c="k")
    for v in b["downbeats"]:
        ax[1].axvline(v, c="r", lw=0.4, alpha=0.5)
    ax[2].plot(np.arange(len(b["energy"])) * 0.5, b["energy"], c="b")
    for s in b["sections"]:
        for a in ax:
            a.axvline(s["t0"], c="lime", lw=1)
        ax[2].text(s["t0"] + 0.3, max(b["energy"]) - 2, s["label"], fontsize=9)
    for s in b["silences"]:
        ax[2].axvspan(s["t0"], s["t1"], color="gray", alpha=0.3)
    for k, v in b["hits"].items():
        for a in ax:
            a.axvline(v, c="gold", lw=2)
        ax[0].text(v + 0.3, 7400, k, color="gold", fontsize=12)
    ax[2].set_xticks(np.arange(0, b["duration"] + 1, 10))
    plt.tight_layout()
    plt.savefig(png, dpi=60)
    plt.close(fig)
