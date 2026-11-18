# Careva+ Motion Studio (Remotion + HyperFrames)

This folder holds the motion-graphics toolchain for Careva+ films.

- **Remotion 4.0.545:** videos written in React. This is what renders the **Pro** robotic UV-C disinfection film.
- **HyperFrames 0.9.66:** HeyGen's open-source HTML-to-video framework. It is installed and ready for HTML-based compositions (`npx hyperframes init`, `npx hyperframes render`). It also has useful checks for the existing HTML films (`npx hyperframes lint`, `npx hyperframes snapshot`).

> **Licence note:** Remotion is free for individuals and for companies with up to 3 employees. Larger companies need a Remotion company licence (remotion.pro). HyperFrames is Apache-2.0.

## The Pro film: Robotic UV-C Disinfection

| Output | File |
|---|---|
| 16:9, 1920×1080, 60 fps, motion blur | `../uvc-disinfection/careva-uvc-pro.mp4` |
| 9:16 Reel, 1080×1920, 60 fps | `../uvc-disinfection/careva-uvc-pro-reel.mp4` |

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
npm run render:wide         # 16:9 → out/careva-uvc-pro.mp4
npm run render:reel         # 9:16 → out/careva-uvc-pro-reel.mp4
```

## Files

- `src/Film.tsx`: every scene, the camera and the timeline. The beat sheet is at the top of the file.
- `src/kit.tsx`: colour themes, fonts, easing, the robot illustration, logo and glass cards.
- `score/score.js`: the synthesised soundtrack, timed to the film.

Facts come from spotless.ai and carevaplus.com, as listed in `../uvc-disinfection/README.md`. The robot and console are original illustrations; no Spotless AI images are used.
