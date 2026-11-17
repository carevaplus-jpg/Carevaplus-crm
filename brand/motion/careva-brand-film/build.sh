#!/usr/bin/env bash
# Rebuild the Careva+ brand film from source.
# Needs: node + playwright (Chromium), python3 + numpy, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK=${WORK:-.build}
mkdir -p "$WORK"

# 1. cue points from the animation -> original score, mastered to ~-14 LUFS / -1.5 dBTP
node render.js cues "$WORK/cues.json"
python3 music.py "$WORK/cues.json" "$WORK/score.wav"
ffmpeg -y -loglevel error -i "$WORK/score.wav" \
  -af "volume=7.2dB,alimiter=limit=0.83:attack=4:release=60:level=false" "$WORK/score_master.wav"

# 2. picture: 900 deterministic frames at 1920x1080 / 30 fps
node render.js frames "$WORK/frames" 30 4

# 3. encode: light film grain (also dithers the dark gradients), BT.709, H.264 + AAC
ffmpeg -y -loglevel error -framerate 30 -i "$WORK/frames/f_%05d.png" -i "$WORK/score_master.wav" \
  -vf "noise=c0s=4:c0f=t,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:v libx264 -preset slow -crf 17 -tune film -profile:v high -movflags +faststart \
  -c:a aac -b:a 256k -ar 48000 -shortest careva-brand-film-1080p.mp4

echo "done -> careva-brand-film-1080p.mp4"
