"""Original music bed for the Careva+ 15s launch video.

Synthesised from scratch with numpy, so it is fully owned (no licence needed).
Tempo is 128.57 BPM, so one beat = 14 video frames at 30fps. The grid is offset
by -2 frames so the scene cuts land on beats 6, 14 and 22 and the final
chord on beat 30 (frame 418, when the CTA button shines).

Usage: python3 remotion/scripts/make-music.py public/audio/careva-bed.wav
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 15.0
N = int(SR * DUR)
BEAT = 14 / 30  # seconds
T0 = -2 / 30  # time of beat 0
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def bt(b):  # beat -> seconds
    return T0 + b * BEAT


def idx(sec):
    return int(np.clip(sec, 0, DUR) * SR)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tone(freq, length, harm=6, roll=1.6, detune=0.0):
    tt = np.arange(int(length * SR)) / SR
    out = np.zeros_like(tt)
    for d in ([-detune, 0, detune] if detune else [0]):
        f = freq * (1 + d)
        for n in range(1, harm + 1):
            out += np.sin(2 * np.pi * f * n * tt + n) / n**roll
    return out


def add(buf, sig, start):
    i = idx(start)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


# chords as MIDI notes (root position voicings around middle C)
CH = {
    "C": [48, 60, 64, 67, 71],
    "G": [43, 59, 62, 67, 69],
    "Am": [45, 60, 64, 69, 71],
    "F": [41, 60, 65, 69, 72],
}
# (start beat, end beat, chord)
PROG = [(-1, 6, "F"), (6, 10, "C"), (10, 14, "G"), (14, 18, "Am"), (18, 22, "F"),
        (22, 26, "C"), (26, 28, "F"), (28, 30, "G"), (30, 33, "C")]

pad = np.zeros(N)
arp = np.zeros(N)
bass = np.zeros(N)
drums = np.zeros(N)
fx = np.zeros(N)

for b0, b1, name in PROG:
    s, e = bt(max(b0, 0)) if b0 >= 0 else 0.0, bt(b1)
    length = e - s + 0.25
    notes = CH[name]
    # warm pad: upper chord tones, detuned, soft attack/release
    p = sum(tone(hz(m), length, harm=5, roll=2.0, detune=0.004) for m in notes[1:])
    env = np.minimum(1, np.arange(len(p)) / (0.25 * SR)) * np.minimum(1, (len(p) - np.arange(len(p))) / (0.25 * SR))
    add(pad, p * env * 0.06, s)
    # pluck arpeggio, 8th notes, upper octave
    seq = [notes[1] + 12, notes[2] + 12, notes[3] + 12, notes[4] + 12, notes[3] + 12, notes[2] + 12]
    k = 0
    b = max(b0, 0)
    while b < b1 and bt(b) < DUR:
        m = seq[k % len(seq)]
        pl = tone(hz(m), 0.6, harm=4, roll=1.2)
        pl *= np.minimum(1, np.arange(len(pl)) / 150) * np.exp(-np.arange(len(pl)) / (0.11 * SR))
        add(arp, pl * 0.09, bt(b))
        k += 1
        b += 0.5
    # bass: driving 8ths after the drop, held note in intro / outro
    root = notes[0] - 12 if notes[0] > 45 else notes[0]
    if 6 <= b0 < 30:
        b = b0
        while b < b1:
            bs = tone(hz(root), BEAT * 0.48, harm=3, roll=2.5)
            bs *= np.minimum(1, np.arange(len(bs)) / 200) * np.exp(-np.arange(len(bs)) / (0.18 * SR))
            add(bass, bs * 0.32, bt(b))
            b += 0.5
    elif b0 >= 30:
        bs = tone(hz(root), 2.0, harm=3, roll=2.5) * np.exp(-np.arange(int(2.0 * SR)) / (0.9 * SR))
        add(bass, bs * 0.4, s)

# drums from the drop (beat 6) to beat 30
kick_env = np.zeros(N)
for b in range(6, 31):
    if 28 <= b < 30:
        continue  # breakdown before the final hit
    kl = int(0.35 * SR)
    kt = np.arange(kl) / SR
    f = 45 + 85 * np.exp(-kt * 30)
    kk = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-kt * 9)
    add(drums, kk * (0.75 if b != 30 else 1.0), bt(b))
    add(kick_env, np.exp(-kt * 7), bt(b))
    if b < 28:
        # offbeat hat
        hl = int(0.05 * SR)
        h = np.diff(rng.standard_normal(hl + 1)) * np.exp(-np.arange(hl) / (0.012 * SR))
        add(drums, h * 0.05, bt(b + 0.5))
        if b % 2 == 1:  # clap on 2 & 4
            cl = int(0.18 * SR)
            c = rng.standard_normal(cl) * np.exp(-np.arange(cl) / (0.04 * SR))
            c = np.diff(np.concatenate([[0], c]))
            add(drums, c * 0.12, bt(b))

# snare roll build into the final chord (beats 28 -> 30)
for i in range(16):
    b = 28 + i / 8
    cl = int(0.08 * SR)
    c = np.diff(np.concatenate([[0], rng.standard_normal(cl)])) * np.exp(-np.arange(cl) / (0.02 * SR))
    add(fx, c * (0.03 + 0.1 * i / 16), bt(b))

# intro swell: pad fades in from silence
pad *= np.clip(t / 1.2, 0, 1)
# sidechain pumping on pad + arp after the drop
duck = 1 - 0.45 * np.clip(kick_env, 0, 1)
pad *= duck
arp *= 0.6 + 0.4 * duck

# final impact chord: bright sustained C with long decay
fs = bt(30)
L = DUR - fs
for m in [48, 55, 60, 64, 67, 72, 76]:
    c = tone(hz(m), L, harm=6, roll=1.4, detune=0.003)
    c *= np.exp(-np.arange(len(c)) / (1.1 * SR))
    add(fx, c * 0.05, fs)

music = pad + arp + bass + drums + fx
music -= np.convolve(music, np.ones(2048) / 2048, mode="same")  # remove DC / sub rumble

# simple reverb: convolve a send with decaying noise
ir_len = int(1.6 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / (0.35 * SR))
ir /= np.sqrt(np.sum(ir**2))
send = pad + arp + fx
nfft = 1 << int(np.ceil(np.log2(N + ir_len)))
wet = np.fft.irfft(np.fft.rfft(send, nfft) * np.fft.rfft(ir, nfft), nfft)[:N]
music = music + wet * 0.25

# stereo: slight width via delayed arp on right
left = music
right = music.copy()
d = int(0.012 * SR)
right[d:] += arp[:-d] * 0.4
left = left + arp * 0.4
st = np.stack([left, right], axis=1)

# master: soft clip, normalise to -1 dBFS, fade tail
st = np.tanh(st * 1.4)
st /= np.max(np.abs(st)) / 0.89
fade = np.clip((DUR - t) / 0.5, 0, 1)[:, None]
st *= fade

out = sys.argv[1] if len(sys.argv) > 1 else "careva-bed.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype("<i2").tobytes())
print("wrote", out)
