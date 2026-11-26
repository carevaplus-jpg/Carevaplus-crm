# Careva AI for Android

The Android app for [Careva AI](../ai-chat/README.md). It's a **Trusted Web Activity** (TWA): a
small native shell (about 0.6 MB) that opens the Careva AI web app full-screen in Chrome's engine,
with its own app icon, splash screen and task in the app switcher. There's no browser address bar.

Why a TWA and not a WebView wrapper:
- **The mic works fully.** Live speech recognition and microphone access come from Chrome. Android
  WebView has no speech recognition.
- **"Connect with OpenRouter" works**, including Google sign-in (Google blocks sign-in inside WebViews).
- **It updates itself.** Redeploying the website updates the app instantly, with no new APK needed.
- The AI models run in the cloud through OpenRouter, so the app stays tiny.

## Install on a phone

1. On the phone, open **https://careva-ai.netlify.app/download/careva-ai.apk**, or use Settings →
   *Download the Android app* inside Careva AI.
2. Open the downloaded file. Android will ask you to allow installs from this source: allow it for
   Chrome or your file manager, then tap **Install**.
3. Open **Careva AI** from your home screen, tap **Connect with OpenRouter**, and start chatting.
   The first time you tap the mic, allow microphone access.

Requires Android 7.0 or newer and Chrome (or another browser that supports TWAs). If none is
installed, it falls back to an in-app WebView.

## How the app and site are linked

`../ai-chat/.well-known/assetlinks.json` (served at
`https://careva-ai.netlify.app/.well-known/assetlinks.json`) lists this app's package name
(`com.carevaplus.ai`) and the SHA-256 fingerprint of its signing certificate
(`signing/sha256.txt`). Chrome checks it to confirm the app owns the site. Only then does it hide
the address bar. If you sign with a different key, or Google Play re-signs the app (Play App
Signing), add that fingerprint to `assetlinks.json` and redeploy the site.

## Build it yourself

Requirements: JDK 17+ and the Android SDK (platform 36, build-tools 36).

```bash
cd android-app
echo "sdk.dir=/path/to/Android/Sdk" > local.properties
# signing: create keystore.properties (never commit it)
#   storeFile=signing/careva-release.jks
#   storePassword=…
#   keyAlias=careva
#   keyPassword=…
./gradlew assembleRelease   # → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease     # → app/build/outputs/bundle/release/app-release.aab (Google Play)
```

**Keep the signing key safe.** `signing/careva-release.jks` and `keystore.properties` are
git-ignored on purpose. Every future update of the installed app must be signed with the same key.

## Publish on Google Play (optional)

1. Create a Google Play Developer account (one-time $25 fee).
2. Create an app, then upload `app-release.aab` under *Production* (or *Internal testing* first).
3. After upload, copy the **App signing key certificate SHA-256** from *Setup → App integrity* and
   add it to `sha256_cert_fingerprints` in `ai-chat/.well-known/assetlinks.json` alongside the
   current one. Redeploy the website.
4. Fill in the store listing, content rating and the privacy policy (chats stay on the device and
   messages go to OpenRouter).

## Settings you might change

| What | Where |
|---|---|
| Website the app opens | `twaHost` in `app/build.gradle` |
| App name | `launcherName` and `app_name` in `app/build.gradle` |
| Package name | `applicationId` and `namespace` in `app/build.gradle`, plus `assetlinks.json` |
| Version for updates | `versionCode` (must increase each release) and `versionName` |
| Colors, splash | `app/src/main/res/values/colors.xml`, `drawable-xxxhdpi/splash.png` |
