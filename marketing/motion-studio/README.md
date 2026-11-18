# Careva+ Motion Studio (Remotion + HyperFrames)

This folder holds the motion-graphics toolchain for Careva+ films.

- **Remotion 4.0.545:** videos written in React. This is what renders the **Pro** robotic UV-C disinfection film.
- **HyperFrames 0.9.66:** HeyGen's open-source HTML-to-video framework. It builds the **Spotless AI opening sting** (`spotless-sting/`, HTML + GSAP), which is checked with `hyperframes check`, rendered to `public/sting-wide.mp4` and `public/sting-reel.mp4`, and played by Remotion as the film's first 3.6 seconds.

> **Licence note:** Remotion is free for individuals and for companies with up to 3 employees. Larger companies need a Remotion company licence (remotion.pro). HyperFrames is Apache-2.0.

## The film: Robotic UV-C Disinfection by Spotless AI

| Output | File |
|---|---|
| **Spotless edition**, 16:9, 1920×1080, 60 fps | `../uvc-disinfection/careva-uvc-spotless.mp4` |
| **Spotless edition**, 9:16 Reel, 1080×1920, 60 fps | `../uvc-disinfection/careva-uvc-spotless-reel.mp4` |
| Earlier Pro version (illustrated robot), 16:9 | `../uvc-disinfection/careva-uvc-pro.mp4` |

**Spotless edition changes:**
- **The real Spotless AI robot** (photo supplied by Careva+) replaces the illustration. It is cut out to `public/robot.png`, with the lamps on a separate layer (`public/robot-lamps.png`) so they can switch on and glow.
- **The Spotless AI logo** (supplied by Careva+) appears in the opening, under "brings you robotic disinfection by", and on the end card. Because the wordmark is white, it sits on a dark pill on light backgrounds.
- **Spotless purple** (`#E040FB → #9013FE → #3D3BF3`, sampled from the logo) is used for the opening, the UV-C step, the progress ring and the wipe.
- **HyperFrames opening sting:** a purple grid draws in, then a macro shot of the lamps as they flicker on, a camera pull-back, rising sparks, the title and the Spotless logo wipe-in.
- **Check scene:** a macro on the real robot's sensor head with a scanning beam.

**What's new compared with the first SaaS version:**
- **Multicolour themes:** each step has its own colour. Map is cyan, Check is amber, UV-C is violet/magenta and Report is green. Glowing mesh backgrounds drift slowly behind each scene.
- **Close-ups:**
  - a macro shot of the lamps igniting
  - the robot's eyes scanning for occupancy
  - the dose slider counting up to Log 4 · 99.99%
  - the UV-C progress ring
  - the "Cycle verified" stamp
- **3D camera:** the console tilts and the camera rides the robot across the map before pulling back.
- **Multicolour stripe wipe:** joins every scene, as the film's signature transition.
- **Kinetic chapter titles:** an outlined numeral, words rising with blur and a glowing underline.
- **Rainbow-gradient headline and end card:** with your logo, phone number and location.
- **Real motion blur:** from `@remotion/motion-blur`.

## Commands

```bash
npm install                 # once
npm run studio              # live preview and scrubbing in the browser (Remotion Studio)
npm run score               # re-synthesise public/score.wav (then normalise to -16 LUFS with ffmpeg)
npm run sting               # HyperFrames: build + render the Spotless opening sting (both formats) into public/
npm run render:wide         # 16:9 → out/careva-uvc-spotless.mp4
npm run render:reel         # 9:16 → out/careva-uvc-spotless-reel.mp4
```

## Files

- `src/Film.tsx`: every scene, the camera and the timeline. The beat sheet is at the top of the file.
- `src/kit.tsx`: colour themes, fonts, easing, the real robot (photo cut-out with a lamp glow layer), the Spotless AI logo, the Careva+ logo and glass cards.
- `score/score.js`: the synthesised soundtrack, timed to the film.
- `spotless-sting/sting.template` + `build.mjs`: the HyperFrames opening. Its build writes `wide/` and `reel/` projects (one root composition each); `npm run check` there runs the HyperFrames lint, layout, motion and contrast checks.

Facts come from spotless.ai and carevaplus.com, as listed in `../uvc-disinfection/README.md`. The robot photo and Spotless AI logo were supplied by Careva+; the console screens are illustrations.
