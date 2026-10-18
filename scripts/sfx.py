"""Programmatic SFX, pitched to the BGM key's pentatonic scale.
render(spec, key) -> (stereo float32 peak 1.0, anchor sample). The anchor is the sample that lands on the cue
frame: 0 for most sounds, the end for a riser (it builds INTO the cue)."""
import numpy as np
from scipy import signal

from common import NOTE, SR, midi_hz, pentatonic

TYPES = ("bell", "tick", "riser", "hit", "chime", "glide", "noise", "whoosh", "pop", "swish", "suck", "sub", "rain")  # + samples.ALIAS


def _t(d):
    return np.arange(int(d * SR)) / SR


def _st(m, width=0.15):
    m = m / (np.abs(m).max() + 1e-9)
    d = int(0.0007 * SR)
    r = np.concatenate([np.zeros(d), m[:-d]])
    return np.stack([m, (1 - width) * m + width * r], 1).astype(np.float32)


def _fade(y, a=0.002, b=0.01):
    n = len(y)  # short sounds: fades shrink so they never exceed the sound itself
    na, nb = max(1, min(int(a * SR), n // 3)), max(1, min(int(b * SR), n // 2))
    y[:na] *= np.linspace(0, 1, na)
    y[-nb:] *= np.linspace(1, 0, nb)
    return y


def tonic(key, octave=4):
    return 12 * (octave + 1) + NOTE.get(key.split()[0], 0)


def chord(key, octave=3):
    r = tonic(key, octave)
    third = 3 if "minor" in key else 4
    return [r, r + 7, r + 12, r + 12 + third, r + 19]


def bell(m, dur=0.7, bright=1.0):
    t, f, y = _t(dur + 0.25), midi_hz(m), 0
    for ratio, amp, k in ((1, 1, 1), (2.0, .30 * bright, 1.8), (3.0, .12 * bright, 2.6), (4.16, .05 * bright, 3.5)):
        y = y + amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * k * 5 / dur)
    return _st(_fade(y)), 0


def tick(dur=0.010, hz=4200, seed=11):
    n = int((dur + 0.01) * SR)
    b, a = signal.butter(2, [hz * 0.6 / (SR / 2), min(hz * 1.6 / (SR / 2), 0.99)], "band")
    y = signal.lfilter(b, a, np.random.default_rng(seed).standard_normal(n)) * np.exp(-np.arange(n) / SR / (dur / 3))
    return _st(_fade(y, 0.0005, 0.003)), 0


def riser(key, dur=3.0, seed=12):
    n = int(dur * SR)
    f, tt, Z = signal.stft(np.random.default_rng(seed).standard_normal(n), SR, nperseg=2048)
    fc = 250 * 24 ** np.clip(tt / dur, 0, 1)
    W = np.exp(-0.5 * (np.log2(np.maximum(f[:, None], 1) / fc[None, :]) / 0.7) ** 2)
    y = signal.istft(Z * W, SR, nperseg=2048)[1][:n]
    p = np.arange(n) / n
    tone = np.sin(2 * np.pi * np.cumsum(midi_hz(tonic(key, 3) + 24 * p)) / SR)
    y = (y / (np.abs(y).max() + 1e-9) + 0.25 * tone) * p ** 2.2
    return _st(_fade(y, 0.01, 0.006), 0.4), n


def hit(key, dur=4.0, seed=13):
    t = _t(dur)
    boom = np.sin(2 * np.pi * np.cumsum(35 + 45 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.45)
    b, a = signal.butter(2, 1800 / (SR / 2))
    nb = signal.lfilter(b, a, np.random.default_rng(seed).standard_normal(len(t))) * np.exp(-t / 0.06)
    pad = sum(np.sin(2 * np.pi * midi_hz(m) * t * (1 + d)) for m in chord(key) for d in (-0.002, 0.002))
    pad = pad * np.minimum(1, t / 0.02) * np.exp(-t / (dur / 3))
    y = boom + 0.5 * nb / (np.abs(nb).max() + 1e-9) + 0.35 * pad / (np.abs(pad).max() + 1e-9)
    return _st(_fade(y, 0.001, 0.3), 0.3), 0


def glide(m0, m1, dur=0.8):
    t = _t(dur)
    f = midi_hz(m0) + (midi_hz(m1) - midi_hz(m0)) * t / dur
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.2 * np.sin(2 * ph)) * np.sin(np.pi * t / dur) ** 1.5
    return _st(y), 0


def noise(dur=2.0, seed=14):
    n = int(dur * SR)
    X = np.fft.rfft(np.random.default_rng(seed).standard_normal(n))
    X /= np.sqrt(np.maximum(np.fft.rfftfreq(n, 1 / SR), 20))
    y = np.fft.irfft(X, n)
    return _st(_fade(y, 0.15, 0.3), 0.6), 0


def whoosh(dur=0.7, seed=15):
    n = int(dur * SR)
    f, tt, Z = signal.stft(np.random.default_rng(seed).standard_normal(n), SR, nperseg=1024)
    fc = 400 * 7 ** np.clip(tt / dur, 0, 1)
    W = np.exp(-0.5 * (np.log2(np.maximum(f[:, None], 1) / fc[None, :]) / 0.5) ** 2)
    y = signal.istft(Z * W, SR, nperseg=1024)[1][:n] * np.sin(np.pi * np.arange(n) / n) ** 2
    return _st(y, 0.5), 0


def pop(m, dur=0.12):
    t = _t(dur)
    y = np.sin(2 * np.pi * np.cumsum(midi_hz(m) * (1 + 0.5 * np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.03)
    return _st(_fade(y, 0.0005, 0.01)), 0


def swish(dur=0.45, seed=17):
    """Air past the lens (transitions): band-limited noise, pitch rises then falls; anchor = loudest point."""
    n = int(dur * SR)
    f, tt, Z = signal.stft(np.random.default_rng(seed).standard_normal(n), SR, nperseg=1024)
    u = np.clip(tt / dur, 0, 1)
    fc = 600 * 6 ** np.sin(np.pi * u)
    W = np.exp(-0.5 * (np.log2(np.maximum(f[:, None], 1) / fc[None, :]) / 0.6) ** 2)
    y = signal.istft(Z * W, SR, nperseg=1024)[1][:n]
    env = np.sin(np.pi * np.arange(n) / n) ** 3
    return _st(_fade(y * env, 0.005, 0.02), 0.5), int(0.5 * n)


def suck(dur=0.6, seed=18):
    """Reverse swell that cuts dead at the end (vacuum before a hit / zoom-through); anchor = end."""
    n = int(dur * SR)
    y = signal.lfilter(*signal.butter(2, 3000 / (SR / 2)), np.random.default_rng(seed).standard_normal(n))
    t = np.arange(n) / n
    y = y * t ** 3 + 0.4 * np.sin(2 * np.pi * np.cumsum(60 + 200 * t ** 2) / SR) * t ** 2
    return _st(_fade(y, 0.02, 0.003), 0.4), n


def sub(dur=1.2):
    """Sub-bass drop: felt more than heard, gives weight to a big moment."""
    t = _t(dur)
    y = np.sin(2 * np.pi * np.cumsum(30 + 40 * np.exp(-t / 0.15)) / SR) * np.minimum(1, t / 0.004) * np.exp(-t / (dur / 3))
    return _st(_fade(y, 0.001, 0.05), 0.0), 0


def rain(dur=3.0, seed=19):
    """Rain bed: filtered noise + random droplets."""
    n = int(dur * SR)
    rg = np.random.default_rng(seed)
    y = signal.lfilter(*signal.butter(2, [800 / (SR / 2), 7000 / (SR / 2)], "band"), rg.standard_normal(n)) * 0.3
    for i in rg.integers(0, n - 2000, int(dur * 40)):
        y[i:i + 400] += rg.uniform(0.2, 1) * np.exp(-np.arange(400) / 60) * np.sin(np.arange(400) * rg.uniform(0.3, 0.9))
    return _st(_fade(y, 0.3, 0.5), 0.7), 0


def render(spec, key):
    """spec: {type, note (pentatonic degree, 0 = tonic), dur, to (glide target degree), variant (samples)}"""
    import samples
    if spec["type"] in samples.ALIAS:
        return samples.load(spec["type"], spec.get("variant", 0))
    if spec["type"] in ("swish", "suck", "sub", "rain"):
        return {"swish": swish, "suck": suck, "sub": sub, "rain": rain}[spec["type"]](*([spec["dur"]] if spec.get("dur") else []))
    sc = pentatonic(key, 72, 98)
    deg = lambda d: sc[int(d) % len(sc)] + 12 * (int(d) // len(sc))
    ty, note, dur = spec["type"], spec.get("note", 0), spec.get("dur")
    if ty == "bell":
        return bell(deg(note), dur or 0.7)
    if ty == "chime":
        return bell(deg(note) + 12, dur or 2.5, bright=0.6)
    if ty == "tick":
        return tick(dur or 0.010)
    if ty == "riser":
        return riser(key, dur or 3.0)
    if ty == "hit":
        return hit(key, dur or 4.0)
    if ty == "glide":
        return glide(deg(note) - 12, deg(spec.get("to", note + 4)) - 12, dur or 0.8)
    if ty == "noise":
        return noise(dur or 2.0)
    if ty == "whoosh":
        return whoosh(dur or 0.7)
    if ty == "pop":
        return pop(deg(note), dur or 0.12)
    raise ValueError(f"未知音效类型 {ty}，可用：{', '.join(TYPES)}，以及采样 {', '.join(samples.ALIAS)}")


def reverb(x, t60=2.0, wet=0.2, seed=16):
    n = int(t60 * SR)
    ir = np.random.default_rng(seed).standard_normal((n, 2)) * np.exp(-6.9 * np.arange(n) / SR / t60)[:, None]
    b, a = signal.butter(1, 5000 / (SR / 2))
    ir = signal.lfilter(b, a, ir, axis=0)
    ir[: int(0.01 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0))
    w = np.stack([signal.oaconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return (x * (1 - wet) + wet * w).astype(np.float32)
