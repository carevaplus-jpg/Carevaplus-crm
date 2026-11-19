# Careva+ intro video

Narrator: a pixel heart mascot in a nurse cap with the Careva+ "plus". Voice: Kokoro `af_heart` at speed 1.05 (see `video.json`). Light theme, 16:9, about 25 seconds.

Build from this folder (see `../engine/README.md`):

```bash
node ../engine/build.cjs . tts     # narration, timeline, subtitles
node ../engine/build.cjs . video   # careva-plus-intro.mp4
```

The narration line under each scene heading is read by the engine, so the voice and the subtitles always match this file. One line per scene; sentences end in `.`, `!` or `?`. To change what is said, edit the line, then run both commands again.

**1. Hello** (mascot large, waving; "Careva+" title, "Care that comes home", three service chips)
Hello! Welcome to Careva+. Trusted home health care, right at your door.

**2. Care at home** (care team card; each row ticks as it is spoken)
Our trained nurses and caretakers come to you. Every patient gets safe, personal care.

**3. Smart CRM** (CRM mock: an enquiry is typed and saved, a follow-up task pops up, the lead becomes a patient)
Every enquiry goes into our smart CRM. A follow-up task is created automatically. So no family waits for a call back.

**4. Close** (mascot hops; "Care that comes home."; book a visit)
Careva+. Care that comes home.
