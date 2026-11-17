# Careva+ — "One Line" brand film

**File:** `careva-brand-film-1080p.mp4` (30 s · 1920×1080 · 30 fps · H.264 + AAC 48 kHz, about −14 LUFS)

**Concept:** One continuous line tells the whole story. A heartbeat on a monitor becomes a home on the
horizon. Inside the home, care lights up as a gold plus. The same line then becomes each of the brand's
values and resolves into the Careva+ mark: *heartbeat → home → care.*

## Storyboard

| # | Time | Visual | Motion | On-screen text | Sound |
|---|------|--------|--------|----------------|-------|
| 1 | 0–3 s | Clinical monitor grid; a glowing line draws one ECG heartbeat | Line sweeps left→right; spike on the beat | Every *heartbeat* matters. | Monitor beep + heartbeat (lub-dub) on the R-peak |
| 2 | 3–6 s | The ECG spike rises into the roof of a house; the grid dissolves | Point-for-point morph; R-peak = roof peak | Every *home* deserves care. | Second heartbeat; felt piano + pad enter |
| 3 | 6–12 s | Gold plus draws inside the home, warm light fills it; a neighbourhood rises and windows light one by one | Slow camera push-in; parallax | Expert care *that comes home.* | Bell on the plus; glass "tinks" on each window |
| 4 | 12–21 s | The house melts into three icons: heart, check-ring, shield (+ gold plus) | Liquid line morphs; masked type, underline draws | 01 Compassionate. · 02 Reliable. · 03 Professional. | Rising bell on each value; the heart beats once |
| 5 | 21–24 s | Home at the centre of a care network: Nurse, Caretaker, Doctor, Family | Links draw out, pulses travel home → people | Care, *coordinated* around you. / AI-assisted scheduling & follow-ups | Plucks per node; riser builds |
| 6 | 24–30 s | Network converges (shock ring), the home becomes the emblem, the plus draws, wordmark rises, light sweep | Expo-out settle, then about 3.5 s of stillness | **Careva+** · HOME HEALTH CARE · Book a home visit → | Rolled D-major resolve, descending piano line, shimmer |

## Design system

| Token | Hex | Use |
|---|---|---|
| Ink | `#03130F` | background (emerald-black) |
| Emerald | `#0B3A31` | dominant field |
| Mint | `#9AF3D6` / glow `#2DD4BF` | the line |
| Gold | `#E9C27E` | warmth: plus, emphasis, CTA |
| Cream | `#F4EFE6` | type |

- **Type:** Fraunces (display serif, SOFT axis) + Inter (support). Both are SIL Open Font License and included in `fonts/`.
- **Easing:** expo-out `(.16,1,.3,1)` for arrivals, expo-in `(.7,0,.84,0)` for exits, `(.65,0,.35,1)` for morphs. Nothing is linear except the orbit ring.
- **Music:** original and synthesised in code (`music.py`, no samples or licensed tracks). 80 BPM, so every scene change lands on a 3 s bar line.

## Files

| File | What it is |
|---|---|
| `index.html` | The animation. Open it in Chrome to preview it live; `index.html?t=26` freezes on a frame |
| `render.js` | Headless-Chromium frame renderer (deterministic `seek(t)`), also exports sound cues |
| `music.py` | Score + sound design, locked to the cues |
| `build.sh` | One command rebuilds the MP4 (needs node + playwright, python3 + numpy, ffmpeg) |
| `careva-brand-film-poster.png` | End-card still, for thumbnails |

## Before publishing

- Add your website / phone number to the end card if you want it on screen (see `#cta` in `index.html`).
- The emblem (home + plus) is a design proposal built for this film. It is not a registered logo.
