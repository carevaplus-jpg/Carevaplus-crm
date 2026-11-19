# Video studio engine

Makes short narrated videos with a pixel mascot: a local Kokoro voice, burned-in subtitles, a mouth that follows the voice, and scenes rendered frame by frame from HTML.

## Pipeline

```
script.md ──► tts.mjs (Kokoro) ──► build.cjs tts ──► timeline.json + narration.wav + <name>.srt
                                                          │
scenes.html.tpl ◄─────────────── window.render(frame) ◄───┘
        │
        └──► build.cjs video ──► headless Chrome (Playwright) ──► ffmpeg ──► <name>.mp4
```

- **Voice:** each sentence is spoken separately, trimmed of silence and measured, so scene animations can be timed to the words.
- **Mouth:** one level per frame from the narration's loudness, so the mascot only talks while the voice does.
- **Render:** the page draws any frame from the frame number alone, so every render is identical.

## Setup

Needs Node 20+, ffmpeg and Google Chrome (or Playwright's Chromium; set `CHROME_PATH` to use another browser binary).

```bash
cd video-studio/engine && ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm install
```

`ONNXRUNTIME_NODE_INSTALL_CUDA=skip` stops onnxruntime from downloading GPU binaries, which the CPU-only voice does not need (and which fails on machines without CUDA).

The Kokoro model (about 90 MB) downloads on the first run. To stay offline, point `KOKORO_CACHE` at a folder that already holds `onnx-community/Kokoro-82M-v1.0-ONNX`.

## Make a video

1. Create `video-studio/<yyyy-mm-dd>-<slug>/` with:
   - `script.md`: one `**N. Scene title** (visual notes)` heading per scene, with the narration on the next line
   - `video.json`: voice, speed, per-scene timing and pronunciation fixes (copy an existing one)
   - `scenes.html.tpl`: the visuals; it must define `window.READY` and `window.render(frame)` and read the timeline from `__TL__`
2. Build from the video folder:

```bash
node ../engine/build.cjs . tts                       # narration, timeline, subtitles
node ../engine/build.cjs . still 3.5 /tmp/frame.png  # check one frame
node ../engine/build.cjs . video                     # render the MP4
```

Scratch files go to `video-studio/.build/<video>/` (git-ignored). The SRT is written into the video folder; the MP4 is encoded in the build folder and copied into the video folder only once it is complete.

## video.json

| Field | Meaning |
|---|---|
| `name` | Output file name (default: folder name without the date) |
| `voice`, `speed` | Kokoro voice and speed, for example `af_heart` and `1.08` |
| `gap` | Silence between sentences, in seconds |
| `lead`, `tail` | Per-scene silence before the first and after the last sentence, keyed by scene number |
| `leadDefault`, `tailDefault` | Used for scenes not listed in `lead` or `tail` |
| `sayAs` | `[regex, spoken]` pairs, for example `["\\$200", "two hundred dollars"]`; subtitles keep the written form |
| `gaps` | Per-scene override of `gap`, keyed by scene number |
| `quantize` | Round each scene up to a multiple of this many seconds, for example one beat (`0.8333` at 72 BPM), so cuts land on the music |
| `music` | `{ "file": "...", "gain": 0.8 }`: a music bed mixed under the narration (path relative to the video folder) |
| `loudness` | Target loudness of the final mix in LUFS, for example `-14` for social platforms |
| `crf` | x264 quality, default 17; the bitrate is capped at 14 Mbit/s |
| `captionChars` | Max characters per subtitle line, default 42 (raise it for scripts such as Tamil, whose vowel signs count as characters) |
| `tts` | `{ "engine": "edge", "voice": "ta-IN-PallaviNeural", "rate": "-4%" }` uses a Microsoft Edge neural voice instead of Kokoro, for languages Kokoro does not speak. Needs `pip install edge-tts`; set `EDGE_PYTHON` to that Python if it isn't `python3` |

In `scenes.html.tpl`, `__ASSETS__` is replaced with the video folder's file URL, so a video can load its own fonts and images, for example `url("__ASSETS__/fonts/my-font.woff2")`.

## Videos

| Video | Length |
|---|---|
| [2026-11-19-careva-plus-intro](../2026-11-19-careva-plus-intro/script.md) (Tamil voice-over, nurse photo) | 44.8 s |
| [2026-11-19-careva-plus-brand-film](../2026-11-19-careva-plus-brand-film/script.md) (premium brand spot, with music) | 35.8 s |

## Credit

Engine adapted from [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) (`video-studio/`), MIT licence, see `LICENSE` in this folder.
