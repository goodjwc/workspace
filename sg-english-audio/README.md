# SG 영어 — 비행기에서 듣는 음성 파일 (MP3)

`../sg-english/js/data.js`(앱과 같은 회화 데이터)로 MP3를 만듭니다.

- 문장 순서: **상대 말(영어) → 번역 → 내 답변(영어, 보통 속도) → 내 답변(영어, 천천히) → 번역**
  - 상대 말이 없는 문장은 "상황. ○○" 한국어 안내로 시작합니다.
- 파일: 상황별 6개(`sg-english-audio-01-immigration.mp3` …) + 전체 1개(`sg-english-audio-00-full.mp3`)
- 음성: Microsoft Edge 뉴럴 음성([edge-tts](https://github.com/rany2/edge-tts), 개인 학습용)
  - 상대: `en-SG-WayneNeural` (싱가포르 영어) / 나: `en-US-GuyNeural` / 번역: `ko-KR-SunHiNeural`

## 내려받기

https://github.com/goodjwc/workspace/releases 의 최신 릴리즈 **Assets**에서 MP3를 받으세요.

## 직접 만들기

```bash
pip install -r requirements.txt
node export-data.js > data.json
python make_audio.py data.json out          # 인터넷 필요
python make_audio.py data.json out --fake   # 음성 대신 신호음으로 조립만 점검
```

GitHub Actions(`.github/workflows/sg-english-android.yml`)의 `audio` 작업이 같은 방법으로 만들어 릴리즈에 올립니다.
