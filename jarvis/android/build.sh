#!/usr/bin/env bash
# Builds Jarvis-Careva.apk with the plain Android SDK tools (no Gradle, no libraries).
# Needs: JDK 17+, and ANDROID_HOME with "platforms;android-34" and "build-tools;34.0.0".
#   ANDROID_HOME=~/Android/Sdk bash build.sh
set -euo pipefail
cd "$(dirname "$0")"

: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK folder}"
BT="$ANDROID_HOME/build-tools/34.0.0"
JAR="$ANDROID_HOME/platforms/android-34/android.jar"
OUT=build
KEYSTORE="${JARVIS_KEYSTORE:-$HOME/.jarvis-android.keystore}"

rm -rf "$OUT" && mkdir -p "$OUT/res" "$OUT/gen" "$OUT/classes"

echo "1/5 Compiling resources"
"$BT/aapt2" compile --dir res -o "$OUT/res/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest AndroidManifest.xml \
    --java "$OUT/gen" --min-sdk-version 24 --target-sdk-version 34 "$OUT/res/res.zip"

echo "2/5 Compiling Java"
javac --release 11 -encoding UTF-8 -classpath "$JAR" -d "$OUT/classes" \
    $(find src "$OUT/gen" -name '*.java') -Xlint:-options

echo "3/5 Converting to Android bytecode"
"$BT/d8" --release --min-api 24 --lib "$JAR" --output "$OUT" $(find "$OUT/classes" -name '*.class')

echo "4/5 Packaging"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT" && zip -q -j unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "5/5 Signing"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkeypair -keystore "$KEYSTORE" -alias jarvis -keyalg RSA -keysize 2048 \
        -validity 10000 -storepass jarvis-careva -keypass jarvis-careva \
        -dname "CN=Careva Plus Jarvis" >/dev/null
fi
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-key-alias jarvis \
    --ks-pass pass:jarvis-careva --key-pass pass:jarvis-careva \
    --out Jarvis-Careva.apk "$OUT/aligned.apk"
"$BT/apksigner" verify Jarvis-Careva.apk
rm -f Jarvis-Careva.apk.idsig
echo "Built $(pwd)/Jarvis-Careva.apk"
