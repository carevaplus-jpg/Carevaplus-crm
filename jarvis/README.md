# Jarvis for Android

A floating, voice-driven AI assistant that sits over any app on your phone. It asks you questions when it needs to, and can (opt-in) speak up proactively.

Inspired by the architecture of [microsoft/JARVIS](https://github.com/microsoft/JARVIS) (HuggingGPT, MIT): plan → select a model → execute → respond. Re-implemented natively with LLMs as the experts. No code is copied from that repo.

## Models
Add any of these keys in **Settings** (stored encrypted on the phone, sent only to their own provider):
- **DeepSeek**: platform.deepseek.com → API keys
- **NVIDIA NIM** (Nemotron and others): build.nvidia.com → Get API key
- **OpenRouter** (free models): openrouter.ai/keys

The router only considers models from providers you have a key for, ranks them per role (planning, reasoning, code, writing, vision, quick, chat) and learns from successes, failures, latency and your thumbs. **Models → Test my models** verifies the top ones live. You can pin a model per role.

## Permissions
- **Display over other apps**: the floating orb.
- **Microphone**: voice input (uses the phone's speech recognizer).
- **Accessibility (optional)**: lets Jarvis read screen text when you ask, and enables proactive mode.

## Proactive mode (off by default)
Silence is the default. Gated by a daily cap, minimum gap, per-app cooldown, quiet hours, a sensitive-app blocklist (banking, passwords, system), duplicate suppression, and a 24h mute after two dismissals. Screen text is sent to your chosen provider only when a nudge is considered.

## Build
`./gradlew :brain:test :app:assembleRelease` (JDK 17+, Android SDK 36). Release signing reads `../android-app/keystore.properties`.

## Honest limitations
- The `brain` module has 20 passing JVM tests. The Android UI, overlay, accessibility and voice code compiles but **has not been run on a device** in the build environment.
- Free tiers rate-limit (OpenRouter ≈ 50 requests/day without credit).
- No wake word; long-press or tap the orb.

## Image generation (v1.1)
Say "draw me a logo…" or "generate an image of…". Jarvis generates with FLUX via Hugging Face, then sends the image to your own safety-check Space (`hf-space/`, wraps `Freepik/nsfw_image_detector`). The image is shown only if the check passes; if the checker is unreachable the image is withheld. Setup: deploy `hf-space/` as a Docker Space, then add the HF token, Space URL and Space token in Settings. Generated images appear in the Chat tab (the orb card shows text only).

## "Hey Jarvis" (v1.2)
While the orb is shown, Jarvis listens in short windows with the phone's speech recogniser for the phrase "Hey Jarvis" (or "Jarvis"). It answers "Yes?" in its voice and listens; "Hey Jarvis, what's the weather" runs the request directly. Toggle on the Home tab. Needs the microphone permission granted before you tap Summon. Limits: it is a recogniser loop, not an on-device wake-word engine, so it uses battery, depends on the phone's speech service, and some phones click when each window starts.
