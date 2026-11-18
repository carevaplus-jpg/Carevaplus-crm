# Careva+ — Robotic UV-C Disinfection (SaaS-style product film)

A 49-second product film in the same family as the other Careva+ films. It uses a light canvas and short headlines that the camera pushes into. The robot's console is rebuilt as clean UI and filmed up close while it works.

| Spec | Value |
|---|---|
| 16:9 | `careva-uvc.mp4`: 1920×1080, 60 fps, motion blur, H.264 + AAC |
| 9:16 Reel | `careva-uvc-reel.mp4`: 1080×1920, the same film recomposed for vertical |
| **Spotless edition** | `careva-uvc-spotless.mp4` (16:9) and `careva-uvc-spotless-reel.mp4` (9:16): 47 s, real robot photo, Spotless logo and purple, HyperFrames opening + Remotion film (source in `../motion-studio/`) |
| Source | `saas.src.html` → `python3 build.py` → `careva-uvc.html` and `careva-uvc-reel.html` (self-contained; scrub them live in a browser) |
| Sound | Synthesised in the page at 100 BPM: soft plucks and pads, UI ticks, a UV-C hum during the cycle, end chime |

## Story

| Time | Scene |
|---|---|
| 0–4.8 s | "Introducing". The red Careva+ **+** opens into a UV-C ring on violet light: **Robotic UV-C disinfection**, by Spotless AI, now with Careva+ |
| 4.8 s | "Clean is a feeling. Disinfected is **a fact.**" |
| 8.4 s | "First, it maps **every room.**" |
| 11.4 s | **Map:** the robot drives the room, walls draw in, objects are found (bed, cabinet, chair), "Map ready ✓" |
| 16.2 s | "Then it checks the room is **empty.**" |
| 19.2 s | **Setup:** occupancy check (cameras + sensors) → "Room empty", dose slider to Log 4 (99.99%), Start cycle |
| 23.4 s | "**UV-C** does the rest. No chemicals." |
| 26.4 s | **Live cycle:** the robot glows violet, progress ring 0 → 100%, "Under 30 min for a typical patient room", three safety chips |
| 32.4 s | "And it **proves it.** Every cycle." |
| 35.4 s | **Report:** rows tick off, dose-by-surface bars, Download report |
| 40.2 s | "Safer rooms for [seniors / new mothers / post-surgery care / ICU at home]" (Careva+ services) |
| 44.4 s | **End card:** Careva+ logo, "Robotic disinfection by Spotless AI", "booked through Careva+", +91 96555 08881, Salem & nearby areas, carevaplus.com, footnote |

## Sources and what is illustrative

- **From spotless.ai (read Nov 2026):**
  - the four steps: Map the Room, Set Parameters, Autonomous Cycle, Cycle Report
  - "A typical room cycle completes in under 30 minutes"
  - "Log 4 (99.99%) validated via NABL-accredited testing", with their log scale
  - "Chemical-Free … no residues"
  - "multiple cameras and depth-sensing cameras" that adjust the dose per surface
  - "an automatic shutoff mechanism if room entry is detected"
  - "designed for operation in unoccupied rooms only"
  - their disclaimer that claims are based on controlled laboratory conditions
- **From carevaplus.com:**
  - services: Elderly Care, Mother & Baby Care, Post-Surgery Care, ICU Setup at Home
  - "Salem and nearby areas"
  - phone +91 96555 08881
- **Illustrative, not real:**
  - In `careva-uvc.mp4`, `careva-uvc-reel.mp4` and `careva-uvc-pro.mp4`, the robot is an original illustration. No Spotless AI images or logos are used, because their site marks them "All Rights Reserved".
  - The console UI, the room data and the report time are illustrations in every version.
- **Supplied by Careva+ (Spotless edition: `careva-uvc-spotless.mp4` and `careva-uvc-spotless-reel.mp4`):**
  - the photo of the Spotless AI robot and the Spotless AI logo. Careva+ should make sure it has Spotless AI's permission to use them in advertising.
  - "now with Careva+" and "booked through Careva+" assume Careva+ offers this service. Confirm this with Spotless AI before publishing.

## Re-render

```bash
python3 build.py
node render.mjs careva-uvc.html check.png --stills 3.4,7.6,12.2,21.2,29,37,41.5,47
node render.mjs careva-uvc.html careva-uvc.mp4 60 4 4
node render.mjs careva-uvc-reel.html careva-uvc-reel.mp4 60 4 4
```

Built with the `explainer-default` module of the motion-graphics skill (based on Barty-Bart/motion-graphics, MIT).
