#!/usr/bin/env bash
# Sample-accurate, beat-aligned audio edit for the BNI 30s cut.
# Segments must match SEGMENTS in remotion/BNICut.tsx. Each join is a 25ms
# equal-power crossfade that uses audio *past* the cut, so timing never drifts.
set -euo pipefail
SRC=${1:-public/edit/bni-source.mp4}; OUT=${2:-out/bni-audio.wav}
SEGS=("0 8.896" "10.197 14.751" "16.052 22.557" "23.858 25.81" "28.41 35.567" "39.47 40.406")
X=0.025; f=""; n=${#SEGS[@]}
for i in "${!SEGS[@]}"; do
  read a b <<<"${SEGS[$i]}"; e=$b; [ $i -lt $((n-1)) ] && e=$(python3 -c "print($b+$X)")
  f+="[0:a]atrim=$a:$e,asetpts=PTS-STARTPTS[s$i];"
done
prev=s0
for ((i=1;i<n;i++)); do f+="[$prev][s$i]acrossfade=d=$X:c1=qsin:c2=qsin[j$i];"; prev=j$i; done
f+="[$prev]afade=t=out:st=29.5:d=0.5,atrim=0:30[out]"
ffmpeg -v error -y -i "$SRC" -filter_complex "$f" -map "[out]" -ar 48000 "$OUT"
