# Careva+ AI (Android)

A private AI chat assistant that runs **entirely on the phone**: no account, no API key and no cost per message.

- **Model:** [Qwen 2.5 1.5B Instruct](https://huggingface.co/litert-community/Qwen2.5-1.5B-Instruct) (Apache-2.0), run on the device with Google's MediaPipe LLM Inference.
- **First launch:** the app downloads the model once (about 1.6 GB, Wi-Fi recommended). After that it works offline and chats never leave the phone.
- **Features:** streaming replies, stop button, saved conversations (drawer), new chat, copy, light Markdown (headings, bullets, bold, code), English and Tamil.
- **Honest limits:** this is a small on-device model. It is good for everyday questions, drafting messages and simple explanations, and much weaker than large cloud models for complex reasoning, long documents or facts. It is not a medical tool.

## Install

1. Copy `release/careva-ai-1.0.0.apk` to an Android phone (Android 8.0 or newer, 64-bit, about 6 GB RAM and 3 GB free storage recommended).
2. Open it and allow "Install unknown apps" for your file manager or browser when asked.
3. Open **Careva+ AI** and tap **Download model**.

This build is signed with a development key. To publish on the Play Store, create your own upload key and add `keystore.properties` (see `app/build.gradle.kts`).

## Build

Needs JDK 17+ and the Android SDK (platform 35, build-tools 35).

```bash
echo "sdk.dir=/path/to/android/sdk" > local.properties
./gradlew assembleRelease   # app/build/outputs/apk/release/app-release.apk
```

## Code

| File | What it does |
|---|---|
| `Engine.kt` | Model info, the one-time download (Android DownloadManager), loading and streaming generation with MediaPipe |
| `Chats.kt` | Conversation data, private JSON storage, and the prompt builder (Qwen chat format, keeps within the 4K context) |
| `ChatViewModel.kt` | App state: download progress, model loading, sending, stopping, saving |
| `Ui.kt` | Jetpack Compose interface: setup screen, chat, drawer, composer, Markdown rendering |
