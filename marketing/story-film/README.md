# Careva+ — "The Plus Comes Home" (story film)

A 27.9-second, one-take story film. The red **+** from the Careva+ logo leaves the wordmark, travels through one family's care journey, and comes home. The camera never cuts.

| Spec | Value |
|---|---|
| Output | `careva-story.mp4` — 1920×1080, 60 fps, real motion blur, H.264 + AAC |
| Length | 27.86 s (52 beats at 112 BPM), loops seamlessly |
| Source | `story.src.html` → `python3 build.py` → `careva-story.html` (self-contained, scrub it live in a browser) |
| Sound | Synthesised in the page (`buildAudio`), every sound placed on its visual contact |

## Why this replaces the first explainer

Review of `../explainer-video/` (the first version):

| Weakness in v1 | What the story film does instead |
|---|---|
| Nine separate scenes that swap like slides | One continuous shot: the camera follows the hero and never cuts |
| Nothing carries the viewer between scenes | One hero (the logo's own +) is on screen from first frame to last |
| The problem is stated in a headline | The problem is shown: three notifications from one family's day |
| About 110 words on screen, 6 cards with 2 lines each | About 45 words; every label is part of a working interface |
| Most of the runtime is static text holds | Every station reacts physically to the hero (types, lights, ticks, fills) |
| 30 fps, no motion blur | 60 fps with 8 sub-frames of motion blur |
| Logo appears mid-film and at the end | The logo is the first frame, the last frame, and the hero's home |

## The story

| Beat | Time | What happens |
|---|---|---|
| 0 | 0.0 s | Logo complete: "Care that comes home." |
| 2.5 | 1.3 s | The + hops out of the wordmark |
| 4–8 | 2.1 s | Three notifications pop as it lands: *Dad can come home today* · *Medicines & dressing, daily* · *Who will care for him?* |
| 10–14 | 5.4 s | It types the answer to "Where do you need care?": **home** |
| 16–19 | 8.6 s | Who it's for lights up: Seniors · After surgery · Ongoing care · Families |
| 21–28 | 11.3 s | It runs through the care plan: Trained nurses · Caretaker support · Personalised care · Organised follow-ups |
| 28–32 | 15.0 s | It rolls "Finding your nurse" from 0 to 100 %: *Nurse matched* |
| 33 | 17.7 s | It lands on *Book a home visit*: *Visit booked*, *Your nurse is on the way* |
| 34–44 | 18.2 s | Launch. The camera pulls out to show the whole journey, then dives home |
| 44–52 | 23.6 s | The + lands back in the wordmark. End card held for 4.3 s |

## What is placeholder

- The family's messages are example content.
- Service names and the four audiences are drawn from the repository README; confirm they match what Careva+ offers.
- "Care that comes home." is a suggested tagline.
- No phone number or website is shown because none was supplied.

## Re-render

```bash
python3 build.py
node render.mjs careva-story.html check.png --stills 0,2.14,5.36,8.57,11.4,16.2,17.95,19.6,25   # contact sheet
node render.mjs careva-story.html draft.mp4 30 1 4                                              # fast draft
node render.mjs careva-story.html careva-story.mp4 60 8 4                                       # final
```

Built with the `explainer-engaging` module of the motion-graphics skill (based on Barty-Bart/motion-graphics, MIT).
