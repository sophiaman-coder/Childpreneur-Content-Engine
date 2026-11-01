#!/usr/bin/env bash
# 為宣傳片加國語旁白（Google TTS 台灣國語），背景音樂喺講嘢時自動降低
# 用法：bash add_voiceover.sh   （需要 pip install gTTS 同 ffmpeg）
set -euo pipefail
cd "$(dirname "$0")"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# 開始秒數|語速|旁白
LINES=(
  "0.25|1.1|小老闆大街！"
  "2.15|1.15|先去市場進貨，"
  "4.25|1.15|訂好價格，開店賺大錢！"
  "6.95|1.3|看懂成本和利潤！"
  "8.62|1.25|邊玩邊學創業！"
)

inputs=(); filters=""; labels=""
for i in "${!LINES[@]}"; do
  IFS='|' read -r start tempo text <<<"${LINES[$i]}"
  gtts-cli -l zh-TW "$text" -o "$WORK/s$i.mp3" 2>/dev/null
  ffmpeg -y -loglevel error -i "$WORK/s$i.mp3" -af \
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=$tempo" \
    -ar 44100 -ac 2 "$WORK/s$i.wav"
  ms=$(python3 -c "print(int($start*1000))")
  inputs+=(-i "$WORK/s$i.wav")
  filters+="[$((i + 1)):a]adelay=${ms}|${ms}[v$i];"
  labels+="[v$i]"
done
filters+="${labels}amix=inputs=${#LINES[@]}:normalize=0,apad,atrim=0:10,volume=1.6,asplit=2[vo][key];"
filters+="[0:a][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=300[bg];"
filters+="[bg][vo]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[out]"

for layout in wide tall; do
  src="output/little-boss-street-promo-$layout.mp4"
  dst="output/little-boss-street-promo-$layout-mandarin.mp4"
  ffmpeg -y -loglevel error -i "$src" "${inputs[@]}" -filter_complex "$filters" \
    -map 0:v -map "[out]" -c:v copy -c:a aac -b:a 192k -ar 44100 -t 10 -movflags +faststart "$dst"
  echo "done: $dst"
done
