# 증액저축 계산기

목표금액까지 남은 금액을 **매달 같은 금액**으로 모을 때와 **매년 정해진 금액씩 늘려** 모을 때의 월 저축액을 계산하는 작은 앱입니다. PC(Windows)와 안드로이드에서 쓸 수 있습니다.

## 내려받기

[최신 버전 내려받기 (Releases)](../../releases/latest) 페이지 아래쪽 **Assets** 에서 파일을 고릅니다.

- **PC(Windows)**: `step-up-savings-…-windows.exe` 를 더블클릭하면 설치 없이 바로 열립니다(실행할 때마다 압축을 풀어서 뜨기까지 몇 초 걸릴 수 있습니다). "Windows의 PC 보호" 창이 뜨면 **추가 정보 → 실행**. 입력한 플랜은 `%APPDATA%\증액저축계산기` 에 저장되어 다시 열어도 남아 있습니다.
- **안드로이드**: `step-up-savings-….apk` 를 휴대폰에서 내려받아 열고 "출처를 알 수 없는 앱 설치"를 허용합니다.

## 개발

```bash
npm install
npm run dev     # 브라우저에서 화면 개발
npm test        # 계산 로직 테스트
npm run app     # 빌드 후 Electron 창으로 확인
npm run build   # release/증액저축계산기.exe 갱신 (실행 중인 exe 는 먼저 닫기)
npm run shot -- .shots/out.png [seed.json]   # 빌드된 화면을 PNG 로 저장
```

## 안드로이드 앱

같은 화면을 Capacitor 로 감싼 안드로이드 앱(패키지 `kr.biblekang.stepupsavings`, 홈 화면 이름 "증액저축")도 만들 수 있습니다. JDK 21 과 Android SDK 36 이 필요합니다(환경변수 `JAVA_HOME`, `ANDROID_HOME`).

```bash
npm run android:apk            # 테스트용 release/증액저축-debug.apk
npm run android:release        # Play 업로드용 release/증액저축.aab + 직접 전달용 release/증액저축.apk (업로드 키 필요)
npm run icons                  # assets/icon.svg 로 모든 아이콘 다시 만들기
npm run store                  # Play 등록 이미지(store/) 다시 만들기
npm run shot -- --device all   # 휴대폰·폴드 11가지 화면 자동 검사
```

- 휴대폰에 설치: apk 파일을 휴대폰으로 옮겨 열고 "출처를 알 수 없는 앱 설치"를 허용합니다.
- Google Play 등록·출시 후 관리: `docs/play-store.md`

## 새 버전 배포 (GitHub Releases)

버전 태그를 올리면 GitHub Actions(`.github/workflows/release.yml`)가 exe 와 apk 를 만들어 Releases 에 올립니다. 내 PC 에서 빌드할 필요가 없습니다.

```bash
npm version patch -m "버전 %s"  # package.json 버전 올리기(1.0.0 → 1.0.1) + 커밋 + 태그 v1.0.1
git push --follow-tags # 코드와 태그를 함께 올리면 자동 빌드 시작 (10분쯤)
```

- 진행 상황은 GitHub 저장소의 **Actions** 탭, 결과는 **Releases**. 태그와 `package.json` 버전이 다르거나 타입 검사·테스트가 실패하면 올라가지 않습니다.
- 기능 추가는 `npm version minor`(1.0.0 → 1.1.0).

### 안드로이드 서명 (선택)

업로드 키를 아래 **Secrets** 에 넣어 두면 서명된 `step-up-savings-v1.2.3.apk` 가 올라갑니다. 없으면 `step-up-savings-v1.2.3-test.apk`(테스트용)가 올라가는데, 빌드할 때마다 서명이 달라 **이전 버전 위에 덮어 설치되지 않습니다**(지우고 다시 설치하면 저장된 플랜이 사라짐). 남에게 나눠 줄 거라면 키를 넣어 두세요.

저장소 **Settings → Secrets and variables → Actions → New repository secret** 에 4개를 추가합니다. 키 만드는 법은 `docs/play-store.md` 3장.

| 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | PowerShell 에서 `[Convert]::ToBase64String([IO.File]::ReadAllBytes("키파일.jks")) \| Set-Clipboard` 로 복사한 글자 |
| `ANDROID_KEYSTORE_PASSWORD` | 키 저장소 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |

## 다른 PC 에서 이어서 작업

```bash
git clone https://github.com/<아이디>/step-up-savings.git
cd step-up-savings
npm install
```

Node.js 22 가 필요하고, 안드로이드 빌드까지 하려면 JDK 21·Android SDK 36 도 설치합니다. 업로드 키(`.jks`, `android/keystore.properties`)는 git 에 없으니 USB 등으로 따로 옮깁니다.

## 계산 규칙

- **남은 개월 수**: `현재날짜 < 그 달 월급날 ≤ 완료날짜` 인 달의 수. 월급날 전이면 이번 달 포함, 월급날 당일부터는 제외. 완료일이 그 달 월급날보다 이르면 마지막 달도 제외. 31일처럼 없는 날은 그 달 말일.
- **균등 저축**: `올림(차액 ÷ 남은 개월 수)`
- **증액 저축**: 현재날짜의 연도(남은 월급날이 없으면 다음 해)를 첫해로, 해마다 월 저축액이 연간 증액액만큼 늘어남. `Σ 그해 개월 수 × 그해 월 저축액 = 차액` 이 되도록 첫해 금액을 구하고 1원 단위 올림.

자세한 설계는 `docs/superpowers/specs/2026-10-12-step-up-savings-design.md` 참고.
