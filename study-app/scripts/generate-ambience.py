"""Generates Vidya's seamless ambient loops (rain, brown noise, ocean, night).

Procedural so the app ships royalty-free audio. Run: python3 scripts/generate-ambience.py
"""
import wave
from pathlib import Path

import numpy as np

SR = 22050
SECONDS = 16
FADE = SR  # 1s crossfade for seamless looping
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"
rng = np.random.default_rng(7)


def one_pole_lowpass(x, a):
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def brown(n):
    w = rng.standard_normal(n)
    b = np.cumsum(w)
    # remove drift so it stays bounded
    b -= one_pole_lowpass(b, 0.0008)
    return b


def pink(n):
    w = rng.standard_normal(n)
    # Paul Kellet's economy pink filter
    b0 = b1 = b2 = 0.0
    out = np.empty(n)
    for i, v in enumerate(w):
        b0 = 0.99765 * b0 + v * 0.0990460
        b1 = 0.96300 * b1 + v * 0.2965164
        b2 = 0.57000 * b2 + v * 1.0526913
        out[i] = b0 + b1 + b2 + v * 0.1848
    return out


def loopify(x):
    n = SR * SECONDS
    body, tail = x[:n].copy(), x[n:n + FADE]
    ramp = np.linspace(0, 1, FADE)
    body[:FADE] = body[:FADE] * ramp + tail * (1 - ramp)
    return body


def norm(x, peak=0.6):
    x = x - np.mean(x)
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def write(name, x):
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(OUT / f"{name}.wav"), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(data.tobytes())
    print("wrote", name)


N = SR * SECONDS + FADE
t = np.arange(N) / SR

# Rain: bright pink noise bed + scattered droplets
bed = pink(N)
bed = bed - one_pole_lowpass(bed, 0.05)  # gentle high-pass
drops = np.zeros(N)
for pos in rng.integers(0, N - 400, 900):
    env = np.exp(-np.arange(400) / rng.uniform(20, 70))
    drops[pos:pos + 400] += env * rng.standard_normal(400) * rng.uniform(0.3, 1.2)
write("rain", loopify(norm(norm(bed, 0.5) + norm(drops, 0.35), 0.55)))

# Brown noise: deep, steady
write("brown", loopify(norm(brown(N), 0.6)))

# Ocean: brown noise swelling in waves (two waves per loop)
swell = 0.25 + 0.75 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 8.0)) ** 2
surf = norm(brown(N), 1) * swell + norm(pink(N), 0.25) * swell ** 3
write("ocean", loopify(norm(surf, 0.6)))

# Night: soft wind + crickets
wind = norm(one_pole_lowpass(rng.standard_normal(N), 0.02), 1)
wind *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 16.0) ** 2
crick = np.zeros(N)
for start in np.arange(0.3, SECONDS, 1.1):
    for k in range(3):
        s = int((start + k * 0.07 + rng.uniform(0, 0.02)) * SR)
        L = int(0.035 * SR)
        tt = np.arange(L) / SR
        crick[s:s + L] += np.sin(2 * np.pi * 4300 * tt) * np.hanning(L) * 0.5
write("night", loopify(norm(norm(wind, 0.5) + crick * 0.25, 0.5)))
