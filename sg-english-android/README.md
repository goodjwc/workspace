# SG 영어 — 안드로이드 앱 (오프라인)

`../sg-english/` 웹앱을 그대로 앱 안에 넣어, 인터넷 없이 실행되는 안드로이드 APK로 만든 프로젝트입니다.

## 내려받기·설치

1. 폰에서 이 저장소의 **Releases** 페이지를 열고, 최신 릴리즈의 `sg-english-<버전>.apk`를 눌러 다운로드합니다.
   https://github.com/goodjwc/workspace/releases
2. 다운로드한 파일을 엽니다. "출처를 알 수 없는 앱" 안내가 나오면 해당 앱(Chrome, 내 파일 등)에서 설치를 허용합니다.
3. **설치**를 누르면 홈 화면에 **SG 영어** 아이콘이 생깁니다. 설치 뒤에는 인터넷이 필요 없습니다.

출처(설치 허용 방법): Android 고객센터 — https://support.google.com/android/answer/7391672

## 웹 버전과 다른 점

| 기능 | 앱(APK) | 웹 |
|---|---|---|
| 인터넷 없이 실행 | ✅ 처음부터 | 한 번 연 뒤부터 |
| 원어민 음성 | 폰의 TTS 엔진 | 브라우저 음성 |
| 내 발음 녹음·비교 | ✅ | ✅ |
| 음성 인식 채점 | ➖ 없음 | ✅ (브라우저 지원 시) |

- 원어민 음성은 폰에 설치된 TTS 엔진을 씁니다. 앱의 ⚙️ 설정에서 "인터넷 필요"로 표시되지 않은 영어 음성을 고르면 오프라인에서도 들립니다.
- 영어 음성이 없으면: 폰 설정 → 텍스트 음성 변환(TTS) → 영어 음성 데이터 설치.

## 구조

- `app/src/main/java/.../MainActivity.java` — WebView로 웹앱을 띄우고, 폰의 TTS(`window.AndroidBridge`)와 마이크 권한을 연결
- 웹 파일은 빌드할 때 `../sg-english/`에서 그대로 가져옵니다 (`app/build.gradle`의 `assets.srcDirs`)
- `app/src/main/res/raw/selftest.js`, `ci/smoke.sh` — CI 에뮬레이터 자동 점검

## 빌드·릴리즈 (GitHub Actions)

`.github/workflows/sg-english-android.yml`

- 작업 브랜치에 푸시 → APK 빌드 + 에뮬레이터 점검 + 비행기용 MP3 생성
- 릴리즈: `VERSION` 파일의 버전을 올리고 커밋 메시지에 `[release]`를 넣어 푸시(또는 `sg-english-v<버전>` 태그 푸시)
  → 위 과정을 모두 통과하면 워크플로가 `sg-english-v<버전>` 태그를 만들고 Releases에 APK·MP3를 게시

### 서명 키 (업데이트 설치용)

저장소 시크릿이 없으면 빌드마다 임시 서명 키를 만듭니다. 이 경우 새 버전을 설치할 때 기존 앱을 먼저 지워야 하고, 학습 기록도 함께 지워집니다.
같은 키로 계속 업데이트하려면 저장소 **Settings → Secrets and variables → Actions**에 아래 두 값을 등록하세요.

- `SG_ENGLISH_KEYSTORE_B64`: 키스토어 파일(.jks)을 base64로 인코딩한 값 (별칭은 `sgenglish`)
- `SG_ENGLISH_KEYSTORE_PASSWORD`: 키스토어·키 비밀번호
