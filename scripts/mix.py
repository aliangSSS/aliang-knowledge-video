"""BGM (loudness-normalised, ducked) + SFX (pitched, gain-staged against the BGM) -> limited master."""
import numpy as np
from scipy import ndimage, signal

import samples as SAM
import sfx as S
from common import SR, active_rms, db, read_wav, undb, write_wav

BGM_RMS_DB = -19.5     # active RMS of the music bed
CEIL_DB = -1.5         # sample-peak ceiling; leaves room for AAC overshoot so the mp4 stays under -1 dBFS
# body RMS of each sfx relative to the bed (dB). "punctuation, not the lead": 6–12 dB under, hits a bit hotter.
# Sample aliases carry their own level in samples.ALIAS.
REL = {"bell": -9, "chime": -11, "tick": -10, "pop": -10, "glide": -8, "whoosh": -12, "riser": -9, "noise": -13, "hit": -5,
       "swish": -11, "suck": -9, "sub": -4, "rain": -14}
HEAVY = {"hit", "sub", "stamp", "thud", "explosion", "boom_low", "metal_heavy", "shatter", "punch"}  # briefly dip the BGM


def level(ty):
    return SAM.ALIAS[ty][2] if ty in SAM.ALIAS else REL[ty]


def pan(y, p):
    """Equal-power pan; p in [-1, 1], or [p0, p1] to sweep across the sound (a whoosh that travels)."""
    if not p:
        return y
    a, b = (p, p) if not isinstance(p, (list, tuple)) else p
    th = (np.linspace(a, b, len(y)) + 1) * np.pi / 4
    m = y.mean(1)
    return np.stack([m * np.cos(th), m * np.sin(th)], 1).astype(np.float32) * np.sqrt(2)


def body_rms(y):
    m = np.abs(y).max(1)
    env = ndimage.maximum_filter1d(m, int(0.01 * SR))
    sel = env > env.max() * undb(-20)
    return float(np.sqrt((y[sel] ** 2).mean() + 1e-12))


def duck_env(n, ducks):
    cr = 100
    g = np.zeros(n // (SR // cr) + 2)
    tt = np.arange(len(g)) / cr
    for d in ducks:
        a, t, b = d["t"] - d["pre"], d["t"], d["t"] + d["post"]
        down = np.clip((tt - a) / max(0.05, d["pre"] * 0.4), 0, 1)
        up = np.clip((b - tt) / max(0.05, d["post"]), 0, 1)
        g = np.minimum(g, d["db"] * np.where(tt < t, down, up))
    return undb(np.interp(np.arange(n) / SR, tt, g)).astype(np.float32)


def limit(x, ceil_db=CEIL_DB):
    c = undb(ceil_db)
    need = np.minimum(1.0, c / np.maximum(np.abs(x).max(1), 1e-9))
    la = int(0.006 * SR)
    g = ndimage.minimum_filter1d(need, 2 * la + 1)
    g = np.minimum(ndimage.uniform_filter1d(g, la), need)
    y = x * g[:, None]
    return np.clip(y, -c, c), float(db(g.min()))


def mix(bgm_path, n_frames, fps, events, ducks, key, out_path, sfx_gain_db=0.0, stems=False, auto_duck=True):
    sr, bgm = read_wav(bgm_path)
    if sr != SR:
        bgm = signal.resample_poly(bgm, SR, sr, axis=0).astype(np.float32)
    n = int(round(n_frames / fps * SR))
    bgm = np.pad(bgm, ((0, max(0, n - len(bgm))), (0, 0)))[:n]
    ref = active_rms(bgm.mean(1), SR)
    bgm *= undb(BGM_RMS_DB) / ref
    auto = [{"t": e["t"], "pre": 0.03, "post": 0.35, "db": -3} for e in events if auto_duck and e["type"] in HEAVY]
    bgm *= duck_env(n, ducks + auto)[:, None]
    fo = int(0.05 * SR)
    bgm[-fo:] *= np.linspace(1, 0, fo)[:, None]

    bus = np.zeros((n, 2), np.float32)
    cache, onsets, used = {}, [], {}
    for e in events:
        sample = e["type"] in SAM.ALIAS
        var = e.get("variant")
        if sample and var is None:  # rotate through the takes so repeats don't sound copy-pasted
            var = used.get(e["type"], 0)
            used[e["type"]] = var + 1
        k = (e["type"], e["note"], e["dur"], var)
        if k not in cache:
            y, anc = S.render({"type": e["type"], "note": e["note"], "dur": e["dur"], "variant": var or 0}, key)
            cache[k] = (y * (undb(BGM_RMS_DB + level(e["type"])) / body_rms(y)), anc)
        y, anc = cache[k]
        y = pan(y, e.get("pan", 0))
        i0 = int(round(e["t"] * SR)) - anc
        a, b = max(0, i0), min(n, i0 + len(y))
        if b > a:
            bus[a:b] += y[a - i0:b - i0] * undb(e["gain"] + sfx_gain_db)
        onsets.append(e["t"])
    bus = S.reverb(bus, t60=1.6, wet=0.18)
    master, gr = limit(bgm + bus)
    write_wav(out_path, SR, master)
    if stems:
        write_wav(str(out_path).replace(".wav", "_bgm.wav"), SR, bgm)
        write_wav(str(out_path).replace(".wav", "_sfx.wav"), SR, bus)

    on = np.unique(np.round(np.array(onsets), 2))  # layers on the same instant are one designed sound, not a crowd
    crowd = [round(float(on[i]), 2) for i in range(len(on) - 2) if on[i + 2] - on[i] < 0.1]
    m = master.mean(1)
    rep = [f"混音：BGM 有效 RMS {BGM_RMS_DB:.1f} dBFS（原曲 {db(ref):.1f}），音效 {len(events)} 个 / {len(cache)} 种，"
           f"峰值 {db(np.abs(master).max()):.2f} dBFS，限幅最多压 {abs(gr):.1f} dB，成品有效 RMS {db(active_rms(m, SR)):.1f} dBFS"]
    if crowd:
        rep.append(f"[warn] 这些时刻 0.1s 内有 3 个以上音效同时起：{crowd[:10]}（规则：同时最多两个）")
    if abs(gr) > 6:
        rep.append("[warn] 限幅压得太多（>6 dB），音效 gain 调低一点")
    return rep
