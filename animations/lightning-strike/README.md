# Struck by Lightning: a 30-second 3D short

An original vertical (9:16) 3D explainer in the viral "what happens if…" short-form style:
a semi-realistic character, a dramatic event, an x-ray cutaway, word-by-word captions,
a narrator and punchy sound design, all in 30 seconds.

- `index.html`: the real-time Three.js film (open it in a browser and press **Play with sound**).
- `lightning-strike.mp4`: the rendered 1080×1920, 30 fps video with narration and SFX.
- `tools/`: the frame-capture (`capture.js`, Playwright) and narration (`voice.py`, espeak-ng + MBROLA) scripts used to render the MP4.

## Shot list

| Time | Shot | Narration |
|---|---|---|
| 0–3.2s | Wide push-in, man alone in a stormy field, rain | "This man is standing in an open field during a storm." |
| 3.2–6s | Low angle: leader, return stroke, re-strikes, flash, camera shake | "Suddenly, a bolt of lightning hits him." |
| 6–11s | X-ray orbit: skeleton, current racing through the body, 300,000,000 V counter | "Up to 300 million volts tear through his body…" |
| 11–16s | Heart macro + ECG: sinus → V-fib → flatline | "The current hits his heart… until it stops." |
| 16–20.5s | Forearm macro: Lichtenberg figure blooms across the skin | "Red fern-like marks called Lichtenberg figures…" |
| 20.5–25.4s | Flashover glow sweeps over the skin, ECG restarts, 90% survive | "But most of it flashed over his skin…" |
| 25.4–30s | He crouches, distant strike, end card | "So if you hear thunder, crouch low and get indoors." |

Facts are from NOAA/NWS lightning-safety material: about 300 million volts per strike, and about 90% of people struck survive.
