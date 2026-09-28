#!/usr/bin/env bash
# 에뮬레이터에서 APK를 설치·실행하고 앱 안의 자동 점검 결과를 확인한다
set -uo pipefail
APK="$1"
OUT="${2:-smoke-out}"
PKG=io.github.goodjwc.sgenglish
mkdir -p "$OUT"

adb install -r "$APK" || exit 1
adb shell pm grant $PKG android.permission.RECORD_AUDIO || true
adb logcat -c
adb shell am start -n $PKG/.MainActivity --ez selftest true

RESULT=""
for i in $(seq 1 60); do
  sleep 2
  RESULT=$(adb logcat -d -s SGEnglishJS:* | grep -o 'SELFTEST_RESULT .*' | head -1 || true)
  [ -n "$RESULT" ] && break
done

adb logcat -d -s SGEnglish:* SGEnglishJS:* > "$OUT/logcat.txt" || true
adb exec-out screencap -p > "$OUT/screen.png" || true
echo "----- app log -----"
cat "$OUT/logcat.txt"
echo "-------------------"

if [ -z "$RESULT" ]; then echo "FAIL: 자동 점검 결과가 없음"; exit 1; fi
JSON="$(echo "${RESULT#SELFTEST_RESULT }" | sed -E 's/ \([^()]*\)$//')"
echo "$JSON" > "$OUT/selftest.json"
echo "selftest: $JSON"

fail=0
check() { # name, jq expression
  if echo "$JSON" | jq -e "$2" > /dev/null; then echo "PASS $1"; else echo "FAIL $1"; fail=1; fi
}
check "화면 로드 (상황 6개)"      '.scenes == 6'
check "앱 모드 인식"               '.isApp == true'
check "오류 없음"                  '.error == null'
check "플래시카드 정답 표시"       '.answer == "Here you go."'
check "롤플레이 상대 말 표시"      '.roleBubble == "Where to?"'
check "앱에서는 녹음 버튼으로 대체" '.roleSpeakButton == true and .recognition == false'
check "녹음"                       '.recordOk == true'
check "뒤로 가기 → 홈"             '.backHome == true'
check "학습 기록 저장"             '.storage == true'
check "TTS 엔진 연결"              '.ttsReady == true'
check "영어 음성 사용 가능"        '.englishAvailable == true or .voiceCount > 0'

if grep -E 'Uncaught|TypeError|ReferenceError|SyntaxError' "$OUT/logcat.txt"; then
  echo "FAIL JS 오류 발생"; fail=1
fi
DONE=$(grep -c 'TTS done' "$OUT/logcat.txt" || true)
echo "INFO 영어 음성 수: $(echo "$JSON" | jq '.voiceCount'), 재생 시간: $(echo "$JSON" | jq '.speakMs')ms, TTS 재생 완료 로그: $DONE"
BYTES=$(grep -o 'TTS synth file bytes=[0-9]*' "$OUT/logcat.txt" | grep -o '[0-9]*$' | head -1)
if [ "${BYTES:-0}" -gt 1000 ]; then echo "PASS TTS 영어 음성 합성 (${BYTES} bytes)"; else echo "FAIL TTS 영어 음성 합성 결과 없음"; fail=1; fi
echo "INFO 스피커 재생 완료 신호는 오디오 장치가 없는 CI 에뮬레이터에서는 오지 않을 수 있음"
exit $fail
