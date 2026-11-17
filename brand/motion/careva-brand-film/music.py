"""Original score for the Careva+ brand film — fully synthesised, no samples.

80 BPM (one bar = 3 s, so every scene change lands on a bar line), D major.
Felt piano + warm pad + sub, with heartbeat thumps and glass chimes
locked to the visual cue points exported by render.js (cues.json).

    python3 music.py cues.json score.wav
"""
import json
import sys
import wave

import numpy as np

SR = 48000
DUR = 30.0
N = int(SR * DUR)
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]

FREQ = np.fft.rfftfreq(N, 1 / SR)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filt(x, lo=None, hi=None, order=2):
    """Zero-phase FFT filter. lo = high-pass corner, hi = low-pass corner."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = np.ones_like(f)
    if hi:
        H /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        H /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * H, len(x))


class Bus:
    def __init__(self, name):
        self.name = name
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, t0, gain=1.0, pan=0.0, right=None):
        i0 = int(round(t0 * SR))
        l = sig if right is None else sig
        r = sig if right is None else right
        if i0 < 0:
            l, r, i0 = l[-i0:], r[-i0:], 0
        n = min(len(l), N - i0)
        if n <= 0:
            return
        gl = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        gr = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        self.L[i0:i0 + n] += l[:n] * gain * gl
        self.R[i0:i0 + n] += r[:n] * gain * gr


rng = np.random.default_rng(2026)

# ------------------------------------------------------------------ voices

def piano(m, vel=0.5, dur=5.0):
    """Soft felt piano: inharmonic partials, brightness follows velocity."""
    f = mtof(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00032
    bright = 0.28 + 0.5 * vel
    for k in range(1, 14):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 14000:
            break
        amp = (1 / k ** 1.1) * bright ** (k - 1)
        dec = (0.55 + 0.55 * k) * (f / 262) ** 0.35
        out += amp * np.sin(2 * np.pi * fk * t + 0.4 * k) * np.exp(-t * dec)
        if k <= 3:  # string pair beating
            out += .45 * amp * np.sin(2 * np.pi * (fk + .7 * k) * t) * np.exp(-t * dec)
    env = 0.6 * np.exp(-t * 2.0 * (f / 262) ** 0.3) + 0.4 * np.exp(-t * 0.42)
    out *= env * np.minimum(1, t / 0.006)
    thump = rng.standard_normal(int(0.04 * SR))
    thump = filt(thump, hi=900) * np.exp(-np.arange(len(thump)) / SR * 90) * 0.08
    out[:len(thump)] += thump
    out *= np.minimum(1, (dur - t) / 0.25)  # tail fade
    return out * vel * 0.22


def bell(m, vel=0.5, dur=5.0):
    f = mtof(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, dec in [(1, 1, .7), (2.0, .45, 1.1), (2.76, .3, 1.6), (4.07, .14, 2.4), (5.4, .09, 3.2), (8.93, .04, 5)]:
        if f * ratio < 16000:
            out += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec)
    out *= np.minimum(1, t / 0.0025) * np.minimum(1, (dur - t) / 0.3)
    return out * vel * 0.16


def tink(m, vel=0.3):
    f = mtof(m)
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + .3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 11)
    return out * np.minimum(1, t / 0.002) * vel * 0.12


def pad(notes, dur, cutoff, att=1.2, rel=2.0, seed=0, vel=1.0):
    """Warm analogue-style pad: 3 detuned band-limited saws per note, stereo."""
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    L = np.zeros(n)
    R = np.zeros(n)
    r = np.random.default_rng(seed)
    for m in notes:
        f = mtof(m)
        for dc, pn in [(-8, -.7), (0, 0), (8, .7)]:
            fv = f * 2 ** (dc / 1200)
            ph = 2 * np.pi * fv * t + 0.9 * np.sin(2 * np.pi * (0.13 + 0.1 * r.random()) * t + r.random() * 6)
            s = np.zeros(n)
            for k in range(1, 48):
                fk = fv * k
                a = (1 / k) / (1 + (fk / cutoff) ** 4)
                if fk > 12000 or a < 2e-3:
                    break
                s += a * np.sin(k * ph + r.random() * 6.28)
            L += s * np.cos((pn + 1) * np.pi / 4)
            R += s * np.sin((pn + 1) * np.pi / 4)
    a = np.clip(t / att, 0, 1)
    env = 0.5 - 0.5 * np.cos(np.pi * a)
    relk = np.clip((t - dur) / rel, 0, 1)
    env *= 0.5 + 0.5 * np.cos(np.pi * relk)
    g = vel * 0.05 / np.sqrt(len(notes))
    return L * env * g, R * env * g


def sub(m, dur, att=.8, rel=1.5, vel=1.0):
    f = mtof(m)
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + .18 * np.sin(4 * np.pi * f * t)
    env = np.clip(t / att, 0, 1) * np.clip(1 - (t - dur) / rel, 0, 1)
    return s * env * vel * 0.2


def thump(vel=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 42 + 58 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 11) * (1 - np.exp(-t * 900))
    click = filt(rng.standard_normal(n), hi=260) * np.exp(-t * 55) * .9
    knock = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 38) * (1 - np.exp(-t * 2000))
    return (body + click * .35 + knock * .22) * vel * 0.55


def boom():
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    f = 36 + 40 * np.exp(-t * 6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 1.6) * (1 - np.exp(-t * 300)) * 0.5


def riser(dur, peak=1.0):
    """Filtered-noise swell whose brightness opens as it rises."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    bands = [filt(noise, lo=c / 2, hi=c) for c in (400, 900, 2000, 4500, 9000)]
    pos = (t / dur) ** 1.6 * (len(bands) - 1)
    out = np.zeros(n)
    for i, b in enumerate(bands):
        out += b * np.clip(1 - np.abs(pos - i), 0, 1)
    env = (t / dur) ** 2.4
    env *= np.minimum(1, (dur - t) / 0.03)
    return out * env * peak * 0.08


# ------------------------------------------------------------------ reverb

def impulse(sec=3.4, seed=9):
    n = int(sec * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    out = []
    for ch in range(2):
        x = r.standard_normal(n)
        lo = filt(x, hi=1800) * np.exp(-6.91 * t / 3.2)
        hi = filt(x, lo=1800) * np.exp(-6.91 * t / 1.3)
        ir = (lo + .6 * hi)
        ir[:int(.022 * SR)] = 0  # pre-delay
        out.append(ir / np.sqrt(np.sum(ir ** 2)))
    return out


IR = impulse()


def convolve(x, ir):
    m = len(x) + len(ir)
    size = 1 << int(np.ceil(np.log2(m)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)
    return y[:len(x)]


# ------------------------------------------------------------------ score
BAR = 3.0
E8 = BAR / 8

pianoB, bellB, padB, subB, fxB, beatB = (Bus(n) for n in ("piano", "bell", "pad", "sub", "fx", "beat"))

# Heartbeats (lub-dub), locked to the line's R-peak and the house reveal
for t0, g in [(cues["heartbeat1"], 1.0), (cues["heartbeat2"], .8), (cues["heartbeatHeart"], .38)]:
    beatB.add(thump(1.0), t0, g)
    beatB.add(thump(.65), t0 + .24, g * .7)

# Monitor beep on the R-peak (A5) — the film's sonic hook
bt = np.arange(int(.5 * SR)) / SR
beep = (np.sin(2 * np.pi * 880 * bt) + .12 * np.sin(2 * np.pi * 1760 * bt)) * np.minimum(1, bt / .004) * np.exp(-np.maximum(0, bt - .09) * 28)
bellB.add(beep * .055, cues["heartbeat1"], 1.0)

# Room tone
air = filt(rng.standard_normal(N), lo=120, hi=2600) * 0.0035
fxB.add(air, 0, 1.0)

# Harmony per bar (bar index -> pad voicing, RH arpeggio tones, LH root)
H = {
    1: ([50, 54, 57, 61, 64], [62, 66, 69, 73, 76], 50),   # Dmaj9
    2: ([47, 54, 57, 62, 64], [59, 62, 66, 69, 76], 47),   # Bm11
    3: ([43, 50, 54, 57, 59], [62, 67, 69, 71, 74], 43),   # Gmaj9
    4: ([42, 50, 54, 57, 64], [62, 66, 69, 74, 76], 42),   # D/F#
    5: ([40, 47, 50, 55, 59], [64, 67, 71, 74, 78], 40),   # Em9
    6: ([43, 47, 50, 54, 57], [62, 66, 67, 71, 74], 43),   # Gmaj7
    7: ([45, 52, 57, 62, 64], [64, 69, 74, 76, 81], 45),   # Asus4
    8: ([38, 45, 50, 54, 57, 64], [62, 66, 69, 74, 76], 38),  # Dadd9 (the resolve)
}

cut = {1: 700, 2: 800, 3: 950, 4: 1100, 5: 1250, 6: 1400, 7: 1700, 8: 2000}
for b, (pv, rh, lh) in H.items():
    t0 = b * BAR
    if b == 8:  # big bloom on the converge hit, sustained through the end card
        L, R = pad(pv, 4.6, cut[b], att=.08, rel=1.4, seed=b, vel=1.25)
        padB.add(L, cues["converge"], 1.0, right=R)
    else:
        L, R = pad(pv, BAR + .2, cut[b], att=1.0 if b > 1 else 1.6, rel=1.6, seed=b, vel=.75 + .05 * b)
        padB.add(L, t0 - .1, 1.0, right=R)
    # sub enters with the pillars
    if b >= 4:
        subB.add(sub(lh if b < 8 else 38, BAR if b < 8 else 4.4, att=.6, rel=1.4, vel=.9 if b < 8 else 1.3),
                 t0 if b < 8 else cues["converge"])

# Piano
pattern = [0, 2, 4, 3, 1, 3, 4, 2]
density = {1: [0, 3, 6], 2: [0, 2, 3, 5, 6], 3: [0, 2, 3, 5, 6], 4: range(8), 5: range(8), 6: range(8), 7: [0, 1, 2, 3]}
for b, pos in density.items():
    pv, rh, lh = H[b]
    t0 = b * BAR
    pianoB.add(piano(lh, .5, 5), t0 + .01, .9, pan=-.25)
    if b >= 2:
        pianoB.add(piano(lh + 7, .32, 4), t0 + 4 * E8, .8, pan=-.2)
    for p in pos:
        m = rh[pattern[p]]
        v = (.44 if p in (0, 4) else .34) + rng.uniform(-.04, .04) + (.04 if b >= 4 else 0)
        pianoB.add(piano(m, v, 4.5), t0 + p * E8 + rng.uniform(-.008, .008), 1.0, pan=(m - 68) / 28)

# Bar 7 build: rising sixteenths into the converge hit
asc = [64, 69, 73, 76, 81, 85, 88, 93]
for i, m in enumerate(asc):
    tt = 7 * BAR + 4 * E8 + i * (BAR / 2) / 8
    pianoB.add(piano(m, .3 + .05 * i, 3.5), tt, 1.0, pan=(m - 76) / 30)

# Resolve: rolled Dadd9 + a descending line under the wordmark
for i, m in enumerate([38, 50, 57, 62, 66, 69, 76]):
    pianoB.add(piano(m, .62 if i < 2 else .5, 6.0), cues["converge"] + i * .028, 1.0, pan=(m - 62) / 40)
for tt, m, v in [(cues["wordmark"], 81, .46), (cues["wordmark"] + .75, 78, .4), (cues["wordmark"] + 1.5, 76, .38), (cues["wordmark"] + 2.25, 74, .42)]:
    pianoB.add(piano(m, v, 5.0), tt, 1.0, pan=.12)

# Glass + bells on story moments
bellB.add(bell(81, .55), cues["housePlus"], 1.0, pan=0)
for i, tt in enumerate(cues["windows"]):
    m = [86, 88, 90, 93, 95, 98][int(rng.integers(0, 6))]
    bellB.add(tink(m, .55), tt, 1.0, pan=rng.uniform(-.8, .8))
for tt, m in zip(cues["pillars"], [78, 81, 86]):
    bellB.add(bell(m, .42), tt + .08, 1.0, pan=.15)
bellB.add(bell(86, .3), cues["shieldPlus"], 1.0, pan=-.3)
for tt, m in zip(cues["nodes"], [74, 76, 78, 81]):
    bellB.add(tink(m, .9), tt + .2, 1.0, pan=-.5 if m in (74, 76) else .5)
bellB.add(bell(81, .6), cues["emblemPlus"], 1.0)
bellB.add(bell(86, .35), cues["emblemPlus"] + .23, 1.0, pan=.2)
for i, m in enumerate([86, 90, 93, 98]):
    bellB.add(tink(m, .7), cues["sweep"] + .3 + i * .09, 1.0, pan=-.4 + i * .27)

# Swells + impact
fxB.add(riser(1.0, .5), cues["heartbeat2"] - 1.0, 1.0)
fxB.add(riser(.9, .4), 11.7 - .9 + .45, 1.0)
fxB.add(riser(2.2, 1.0), cues["converge"] - 2.2, 1.0)
fxB.add(boom(), cues["converge"], 1.0)
sh = filt(rng.standard_normal(int(1.6 * SR)), lo=5000, hi=12000)
tt = np.arange(len(sh)) / SR
fxB.add(sh * np.sin(np.pi * tt / 1.6) ** 2 * .025, cues["sweep"], 1.0)

# Reverse-reverb swell into the converge hit
chord = np.zeros(int(4 * SR))
for m in [62, 66, 69, 74, 81]:
    p = piano(m, .5, 4.0)
    chord[:len(p)] += p
wet = convolve(np.concatenate([chord, np.zeros(int(1 * SR))]), IR[0])[::-1]
wet = wet[-int(2.0 * SR):]
wet *= np.linspace(0, 1, len(wet)) ** 2
fxB.add(wet / np.max(np.abs(wet)) * .16, cues["converge"] - len(wet) / SR, 1.0)

# ------------------------------------------------------------------ mix
sends = {"piano": .5, "bell": .7, "pad": .35, "sub": 0, "fx": .25, "beat": .15}
gains = {"piano": 1.0, "bell": 1.0, "pad": 1.1, "sub": .32, "fx": .8, "beat": 1.6}
busses = [pianoB, bellB, padB, subB, fxB, beatB]
for b in busses:
    rms = np.sqrt(np.mean(b.L ** 2 + b.R ** 2) / 2)
    print(f"{b.name:6s} rms {20 * np.log10(rms + 1e-12):6.1f} dBFS  peak {20 * np.log10(np.max(np.abs(b.L)) + 1e-12):6.1f}")

dryL = sum(b.L * gains[b.name] for b in busses)
dryR = sum(b.R * gains[b.name] for b in busses)
sendL = sum(b.L * gains[b.name] * sends[b.name] for b in busses)
sendR = sum(b.R * gains[b.name] * sends[b.name] for b in busses)
wetL = convolve(sendL, IR[0])
wetR = convolve(sendR, IR[1])
L = dryL + .55 * wetL
R = dryR + .55 * wetR

for b in busses:
    prof = [20*np.log10(np.sqrt(np.mean(b.L[i*SR:(i+1)*SR]**2))*gains[b.name]+1e-9) for i in range(0,30,2)]
    print(f"{b.name:6s}", " ".join(f"{v:5.0f}" for v in prof))
L = filt(L, lo=28)
R = filt(R, lo=28)

# fade in/out with the picture
t = np.arange(N) / SR
fade = np.clip(t / .6, 0, 1) * (0.5 + 0.5 * np.cos(np.pi * np.clip((t - 28.4) / 1.6, 0, 1)))
L *= fade
R *= fade

peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
L, R = L / peak * .7, R / peak * .7
# gentle soft-clip glue
L, R = np.tanh(L * 1.15) / 1.15, np.tanh(R * 1.15) / 1.15

dither = (rng.random((2, N)) - rng.random((2, N))) / 32768
pcm = np.stack([L, R]) + dither
pcm = (np.clip(pcm, -1, 1) * 32767).astype(np.int16).T.copy()
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", OUT)
