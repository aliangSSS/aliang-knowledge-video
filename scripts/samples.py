"""Real foley (Kenney, CC0) by alias. Each alias has ~5 variants; repeated uses rotate through them.
Use the alias as an sfx "type" in storyboard.json, e.g. {"type": "stamp"}, {"type": "paper", "pan": -0.4}."""
import re
from pathlib import Path

import numpy as np

from common import ROOT, SR, read_wav, run_ff

# alias: (pack, filename stem, level dB relative to the music bed)
ALIAS = {
    # impacts
    "stamp": ("impact", "impactPunch_heavy", -3), "punch": ("impact", "impactPunch_medium", -6),
    "thud": ("impact", "impactSoft_heavy", -5), "soft": ("impact", "impactSoft_medium", -8),
    "knock": ("impact", "impactWood_light", -8), "wood": ("impact", "impactWood_medium", -7),
    "plank": ("impact", "impactPlank_medium", -7), "metal": ("impact", "impactMetal_medium", -8),
    "metal_light": ("impact", "impactMetal_light", -10), "metal_heavy": ("impact", "impactMetal_heavy", -5),
    "clink": ("impact", "impactGlass_light", -10), "glass": ("impact", "impactGlass_medium", -8),
    "shatter": ("impact", "impactGlass_heavy", -5), "plate": ("impact", "impactPlate_medium", -8),
    "tin": ("impact", "impactTin_medium", -8), "bell_hit": ("impact", "impactBell_heavy", -7),
    "pick": ("impact", "impactMining", -8), "tap": ("impact", "impactGeneric_light", -9),
    "step": ("impact", "footstep_concrete", -10), "step_wood": ("impact", "footstep_wood", -10),
    "step_soft": ("impact", "footstep_carpet", -11), "step_grass": ("impact", "footstep_grass", -11),
    "step_snow": ("impact", "footstep_snow", -11),
    # interface
    "click": ("interface", "click", -10), "select": ("interface", "select", -10), "switch": ("interface", "switch", -10),
    "toggle": ("interface", "toggle", -10), "ui_tick": ("interface", "tick", -11), "confirm": ("interface", "confirmation", -9),
    "error": ("interface", "error", -9), "question": ("interface", "question", -10), "glitch": ("interface", "glitch", -9),
    "scratch": ("interface", "scratch", -10), "scroll": ("interface", "scroll", -11), "pluck": ("interface", "pluck", -10),
    "drop": ("interface", "drop", -9), "bong": ("interface", "bong", -9), "open": ("interface", "open", -10),
    "close": ("interface", "close", -10), "maximize": ("interface", "maximize", -10), "minimize": ("interface", "minimize", -10),
    "back": ("interface", "back", -10), "ui_glass": ("interface", "glass", -10),
    # sci-fi
    "thruster": ("scifi", "thrusterFire", -6), "explosion": ("scifi", "explosionCrunch", -5),
    "boom_low": ("scifi", "lowFrequency_explosion", -4), "computer": ("scifi", "computerNoise", -12),
    "forcefield": ("scifi", "forceField", -10), "laser": ("scifi", "laserSmall", -10), "laser_big": ("scifi", "laserLarge", -8),
    "laser_retro": ("scifi", "laserRetro", -10), "door_open": ("scifi", "doorOpen", -9), "door_close": ("scifi", "doorClose", -9),
    "metal_sci": ("scifi", "impactMetal", -8),
}


def sfx_dir():
    for d in (ROOT / "assets" / "sfx", Path(__file__).resolve().parent.parent / "assets" / "sfx"):
        if d.exists():
            return d
    raise FileNotFoundError("assets/sfx not found (copy it from the skill's assets/ folder)")


def files(alias):
    pack, stem, _ = ALIAS[alias]
    return sorted(p for p in (sfx_dir() / pack).glob("*.ogg") if re.fullmatch(re.escape(stem) + r"_\d+", p.stem))


def load(alias, variant=0):
    """(stereo float32, peak 1.0, starting at the transient; anchor sample = 0)."""
    fs = files(alias)
    if not fs:
        raise ValueError(f"no files for sample alias {alias}")
    src = fs[variant % len(fs)]
    cache = ROOT / ".cache" / "sfx" / (src.stem + ".wav")
    if not cache.exists():
        cache.parent.mkdir(parents=True, exist_ok=True)
        run_ff(["-y", "-i", src, "-ac", 2, "-ar", SR, "-c:a", "pcm_s16le", cache])
    _, x = read_wav(cache)
    m = np.abs(x).max(1)
    on = int(np.argmax(m > m.max() * 0.03))
    y = x[max(0, on - int(0.002 * SR)):].copy()
    n = min(len(y), int(0.002 * SR))
    y[:n] *= np.linspace(0, 1, n)[:, None]
    return (y / (np.abs(y).max() + 1e-9)).astype(np.float32), 0


def variants(alias):
    return len(files(alias))
