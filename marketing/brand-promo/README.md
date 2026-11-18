# Careva+ — Brand Film (high-energy promo)

A 21-second, beat-locked brand promo. It is the punchy counterpart to the calm explainer (`../explainer-video/`) and the one-take story (`../story-film/`).

| Spec | Value |
|---|---|
| Output | `careva-promo.mp4` — 1920×1080, 60 fps, real motion blur, H.264 + AAC |
| Length | 21.09 s (45 beats at 128 BPM) |
| Source | `promo.src.html` → `python3 build.py` → `careva-promo.html` (self-contained, scrub it live in a browser) |
| Reel (9:16) | `careva-reel.mp4` — 1080×1920 for Instagram Reels, YouTube Shorts and TikTok; same timing and sound, every scene recomposed for vertical (`reel.src.html` → `python3 build.py reel` → `careva-reel.html`) |
| Sound | Synthesised in the page (`buildAudio`): kick, clap, sub bass, risers, impacts on every flood |

## The idea

The red **+** from the logo carries the eye through every transition. Nothing simply cuts:

- A green **+** spark stretches into a line, and the line floods the frame.
- The **+** slams onto the name, then grows until it fills the screen.
- A red **+** dots "with care", and ink floods out of it.
- Particles assemble into a **+**, then burst.
- The "Booked" button floods the frame green.
- The services collapse to a dot, the dot becomes the **+**, and the **+** flies home into the logo.

## Beat sheet

| Beat | Time | Scene |
|---|---|---|
| 0 | 0.0 s | **Open**: dark grid; a green + spark stretches into a line and floods the frame |
| 4 | 1.9 s | **Brand**: CAREVA letters on 1/16 notes, weight morphs thin → black, the red + slams on; "health care, right at home." |
| 10 | 4.7 s | **Kinetic type**: NURSES · CARETAKERS · AT HOME · *with care* (handwritten) |
| 19 | 8.9 s | **Signature**: 1,700 particles burst and assemble a plus; "built around one patient." |
| 24 | 11.3 s | **Product**: booking card in 3D; the toggle flicks on, the bar fills, "Booked ✓", toast "Your nurse is on the way" |
| 30 | 14.1 s | **Services**: Home nursing · Elder care · Post-surgery care · Caretakers · Care plans |
| 33 | 15.5 s | **Bridge**: the frame collapses to a dot, ring pulses, the dot becomes the + |
| 35 | 16.4 s | **End card**: logo assembles, the + docks, "Care that comes home.", BOOK A HOME VISIT, +91 96555 08881 |

## Placeholders

- The booking card and toast are example interface content.
- The services list, "Care that comes home." and "Book a home visit" are suggestions; confirm the services match what Careva+ offers.
- The end card shows the phone number +91 96555 08881. No website is shown because none was supplied.
- No statistics are shown because none were supplied.

## Re-render

```bash
python3 build.py
node render.mjs careva-promo.html check.png --stills 0.9,2.0,4.3,5.9,7.6,9.4,10.4,12.8,14.0,15.1,16.3,19.5
node render.mjs careva-promo.html draft.mp4 30 1 4          # fast draft
node render.mjs careva-promo.html careva-promo.mp4 60 8 4   # final

python3 build.py reel                                        # 9:16 Reel
node render.mjs careva-reel.html careva-reel.mp4 60 8 4
```

Built with the `explainer-high-energy` module of the motion-graphics skill (based on Barty-Bart/motion-graphics, MIT). Fonts: Montserrat, Instrument Serif, JetBrains Mono and Caveat (all SIL OFL).
