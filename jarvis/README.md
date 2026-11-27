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
