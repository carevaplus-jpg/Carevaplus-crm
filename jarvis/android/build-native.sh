#!/usr/bin/env bash
# Builds the on-phone AI engine (llama.cpp + JNI bridge) for 64-bit ARM phones, in two variants.
# Needs: Android NDK r28+, CMake 3.22+, Ninja, and a llama.cpp checkout.
#   ANDROID_NDK=~/Android/Sdk/ndk/28.x LLAMA_DIR=~/src/llama.cpp bash build-native.sh
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_NDK:?Set ANDROID_NDK to your Android NDK folder}"
: "${LLAMA_DIR:?Set LLAMA_DIR to a llama.cpp checkout (git clone https://github.com/ggml-org/llama.cpp)}"
OUT=libs/arm64-v8a
mkdir -p "$OUT"
STRIP="$ANDROID_NDK/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-strip"
build() {  # $1 = library name, $2 = CPU target
    local dir="build/native-$1"
    rm -rf "$dir"
    cmake -S jni -B "$dir" -G Ninja -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK/build/cmake/android.toolchain.cmake" \
        -DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-24 \
        -DGGML_CPU_ARM_ARCH="$2" -DJARVIS_LIB_NAME="$1" -DLLAMA_DIR="$LLAMA_DIR" >/dev/null
    cmake --build "$dir" --target jarvis_llama
    "$STRIP" --strip-unneeded "$dir/lib$1.so" -o "$OUT/lib$1.so"
}
build jarvis_llama        armv8.2-a+dotprod   # fast: most phones since 2018
build jarvis_llama_compat armv8-a             # compatible: older phones
ls -la "$OUT"
