"""Original ambient score for the Careva+ explainer (80 BPM, 63 s), synthesised with numpy.
   Arc: tender minor (0-13.5) -> suspended lift (13.5-18) -> warm major bloom on logo (18) -> resolve (57)."""
import numpy as np, wave, sys
SR = 48000; DUR = 63.0; N = int(SR * DUR)
out = np.zeros((N, 2))
rng = np.random.default_rng(11)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def env(n, a, r, sus=1.0):
    e = np.ones(n) * sus; ai = max(1, int(a * SR)); ri = max(1, int(r * SR))
    e[:ai] = np.linspace(0, 1, ai) ** 2 * sus; e[-ri:] *= np.linspace(1, 0, ri) ** 1.5; return e
def add(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); j = min(N, i + len(sig)); s = sig[:j - i] * g
    out[i:j, 0] += s * np.sqrt((1 - pan) / 2); out[i:j, 1] += s * np.sqrt((1 + pan) / 2)
def pad(notes, t, d, g):
    n = int((d + 1.2) * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m in notes:
        f = hz(m)
        for det in (-0.12, 0.12):  # gentle chorus
            ff = f * 2 ** (det / 12 / 4)
            s += np.sin(2*np.pi*ff*tt) + .22*np.sin(4*np.pi*ff*tt) + .06*np.sin(6*np.pi*ff*tt)
    s *= env(n, 1.1, 1.6) * (1 + .08*np.sin(2*np.pi*.23*tt)); add(s / len(notes), t, 0, g)
def pluck(m, t, g, pan=0.0, dec=1.6):
    n = int(2.6 * SR); tt = np.arange(n) / SR; f = hz(m)
    s = (np.sin(2*np.pi*f*tt) * np.exp(-tt*dec) + .35*np.sin(4*np.pi*f*tt) * np.exp(-tt*dec*2.2)
         + .12*np.sin(6*np.pi*f*tt) * np.exp(-tt*dec*3.5))
    s[:240] *= np.linspace(0, 1, 240); add(s, t, pan, g)
def bass(m, t, d, g):
    n = int(d * SR); tt = np.arange(n) / SR; f = hz(m)
    s = (np.sin(2*np.pi*f*tt) + .15*np.sin(4*np.pi*f*tt)) * env(n, .05, .8); add(s, t, 0, g)
def thump(t, g):
    n = int(.5 * SR); tt = np.arange(n) / SR
    f = 46 + 70 * np.exp(-tt * 28); s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt * 9); add(s, t, 0, g)
def swell(t0, t1, g):  # filtered-noise riser
    n = int((t1 - t0) * SR); x = rng.normal(0, 1, n)
    k = np.linspace(0.02, 0.35, n); y = np.zeros(n); acc = 0.0
    for i in range(0, n, 64):  # block one-pole low-pass with rising cutoff
        a = k[i]; seg = x[i:i+64]; o = np.empty_like(seg)
        for j, v in enumerate(seg): acc += a * (v - acc); o[j] = acc
        y[i:i+64] = o
    y *= np.linspace(0, 1, n) ** 2.2; add(y / np.abs(y).max(), t0, 0, g)
def bell(t, g):
    for m, p in ((86, -.3), (93, .3), (98, 0)): pluck(m, t, g, p, dec=0.9)

# chords (MIDI) — D major world
Bm7, Gmaj7, Em7, Asus, A = [47,54,57,62,66], [43,50,54,59,62], [40,47,55,59,62], [45,52,57,62,64], [45,52,57,61,64]
D, Acs, Bm, G, Dadd9 = [50,57,62,66,69], [49,57,61,64,69], [47,54,59,62,66], [43,50,59,62,67], [38,50,57,62,64,66,69]
roots = {id(D):38, id(Acs):37, id(Bm):35, id(G):31}

# 0 – 13.5 : tender, sparse
for t, c in ((0,Bm7),(3,Gmaj7),(6,Bm7),(9,Gmaj7)): pad(c, t, 3.0, .16)
pad(Em7, 12, 1.5, .16)
for i, m in enumerate([66,69,71,69, 66,62,67,66, 66,69,71,74, 71,69,67,66]):
    t = 1.5 + i * .75
    if t < 13.4: pluck(m + 12, t, .055 + .02*(i % 2 == 0), pan=(-.35 if i % 2 else .35))
# 13.5 – 18 : suspended lift into the reveal
pad(Asus, 13.5, 2.25, .18); pad(A, 15.75, 2.25, .18)
for i in range(6): pluck([69,71,73,76,78,81][i] + 12, 13.5 + i*.75, .05, pan=(i%2-.5)*.6)
swell(15.0, 18.0, .10)
# 18 : bloom
bell(18.0, .09); thump(18.0, .55); bass(26, 18.0, 3.0, .22)
prog = [D, Acs, Bm, G]
arp = [0, 2, 3, 4, 1, 3, 4, 2]
for b, t in enumerate(np.arange(18.0, 57.0, 3.0)):
    c = prog[b % 4]; pad(c, t, 3.0, .15); bass(roots[id(c)], t, 3.0, .20)
    for k in range(8):  # eighth-note arpeggio
        m = c[arp[k] % len(c)] + 12
        pluck(m, t + k*.375, .045 + (.02 if k in (0, 4) else 0), pan=(-.4 if k % 2 else .4), dec=2.2)
    if t >= 24.0:
        thump(t, .30); thump(t + 1.5, .2)
    if t in (30.0, 39.0, 48.0):
        bell(t, .045)
# 57 : resolution on the end card
pad(Dadd9, 57.0, 5.0, .2); bass(26, 57.0, 5.5, .22); thump(57.0, .4); bell(57.0, .07)
for i, m in enumerate([74, 78, 81, 86]): pluck(m, 57.75 + i*.75, .05, pan=(i%2-.5)*.5, dec=1.2)

# reverb: convolve with decaying stereo noise
L = int(2.8 * SR); tt = np.arange(L) / SR
ir = rng.normal(0, 1, (L, 2)) * np.exp(-tt * 2.3)[:, None]; ir[:int(.012*SR)] = 0; ir /= np.sqrt((ir**2).sum(0))
nfft = 1 << int(np.ceil(np.log2(N + L)))
wet = np.stack([np.fft.irfft(np.fft.rfft(out[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], 1)
mix = out * .75 + wet * .55
# gentle fades + normalise to ~-1 dBFS peak
mix[:int(.4*SR)] *= np.linspace(0, 1, int(.4*SR))[:, None]
mix[-int(2.2*SR):] *= (np.linspace(1, 0, int(2.2*SR)) ** 1.4)[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.1) ; mix *= .89 / np.abs(mix).max()
path = sys.argv[1] if len(sys.argv) > 1 else 'score.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', path)
