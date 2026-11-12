# Swallowed Gum: a 30-second 3D short (silent)

An original vertical (9:16) 3D explainer in the viral "what happens if…" short-form style.
Topic: does swallowed chewing gum really stay in your stomach for seven years?

- `index.html`: the real-time Three.js film. Serve this folder over HTTP (for example `npx serve .`) and press Play.
- `narration-script.md`: the voice-over script with timings, ElevenLabs settings, a sound-effect cue sheet and upload copy.
- `assets/man.glb`: the rigged character (body, skin, clothes, hair, eyes, 163-bone skeleton).
- `assets/street_8k.jpg`, `assets/street_2k.hdr`: the photographed street used as backdrop and lighting.
- `tools/build-character.py`: assembles the character GLB from MakeHuman data files.
- `tools/capture.js`: the Playwright frame-capture script used to render the videos.

The rendered videos are silent, 1080×1920 at 30 fps: one with burned-in captions and one clean.

## Asset credits

- Character: MakeHuman base mesh, skin, clothes, hair and rig (CC0), from the MakeHuman Community.
- Environment: "Urban Street 01" HDRI (CC0), from Poly Haven.
