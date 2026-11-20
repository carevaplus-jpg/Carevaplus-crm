# Careva+ brand film

A 36-second premium brand spot for Careva+ home health care. 16:9, 1920×1080, 30 fps.

**Concept:** *Care that comes home.* One thin teal line carries the whole film: it beats as a heartbeat, rises into the roof of a home, underlines each promise, traces the care timeline, and finally draws the Careva+ mark.

**Look:** deep navy (#0B1430), off-white (#F3EFE7), teal (#2FB8B0) as the single accent, a touch of coral (#F2557A) for the heart. Instrument Serif for headlines, Inter for support text. Soft glows, film grain, slow camera drift. Expo-out entrances, expo-in exits, generous holds.

**Logo:** the Careva+ logo with light lettering for the dark background (`images/careva-logo-on-dark.png`), revealed on the end card.

**Sound:** Kokoro `af_heart` voice at 0.97 speed over an original 72 BPM music bed made by `music.cjs` (warm pads, a soft piano note on each key reveal, a heartbeat on the opening pulse). Scenes are rounded to whole beats so every cut lands on the music. Mixed to −14 LUFS. On-screen text carries the message with the sound off; subtitles are delivered as `careva-plus-brand-film.srt` rather than burned in.

**Build** (from this folder):

```bash
node ../engine/build.cjs . tts      # voice, timeline, subtitles
node music.cjs                      # music bed, cut to the timeline
node ../engine/build.cjs . video    # careva-plus-brand-film.mp4
```

The narration line under each scene heading is what the voice says. One line per scene; sentences end in `.`, `!` or `?`.

**1. Hook** (navy; the teal line beats once like a heartbeat, then rises into a roofline; a small plus glows inside the home; "Healing feels different at home.")
Healing feels different at home.

**2. Who we are** ("Trained nurses. Caring hands."; a stethoscope drawn in one line inside a slowly turning ring)
Careva+ brings trained nurses and caring hands to your door.

**3. Values** (kinetic serif type, one word per beat, the line underlines each)
Compassionate. Reliable. Professional.

**4. Personal care** ("Care built around one person."; three glass cards draw in: Comfort, Safety, Routine)
Every care plan is shaped around one person. Their comfort, their safety, their routine.

**5. Smart AI CRM** ("Every enquiry answered. Every follow-up, on time."; a glass timeline: enquiry, call back, nurse assigned, follow-up)
Behind every visit, a smart AI system is at work. It keeps every enquiry and follow-up on track.

**6. End card** (the teal line draws across and the Careva+ logo wipes in from it; tagline, "Book a home visit"; light sweep; hold)
Careva+. Care that comes home.
