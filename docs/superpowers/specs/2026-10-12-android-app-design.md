# 증액저축 안드로이드 앱 — 설계 스펙

- 작성일: 2026-10-12
- 상태: 설계 승인됨, 스펙 검토 대기
- 기반: `2026-10-12-step-up-savings-design.md` (계산 규칙·화면 구성은 그대로, 이 문서는 추가·변경분만 다룬다)

## 1. 목적

PC exe 로 만든 증액저축 계산기를 같은 React 코드로 **안드로이드 앱**으로도 내고, Google Play 에 올릴 수 있게 준비한다.
휴대폰(일반·S 울트라), 플립8, 폴드8, 폴드8 울트라의 접힌·펼친 화면 모두에서 어색하지 않게 보여야 한다.
아이콘은 증액저축에 맞게 새로 만들어 PC·안드로이드·Play 에 함께 쓴다.

### 성공 기준

- `npm run android:apk` 가 설치 가능한 `release/증액저축-debug.apk` 를 만든다.
- 업로드 키를 설정하면 `npm run android:release` 가 서명된 `release/증액저축.aab`(Play 업로드용)와 `release/증액저축.apk`(직접 전달용)를 만든다.
- 빌드된 앱 정보: 패키지 `kr.biblekang.stepupsavings`, 홈 화면 이름 `증액저축`, targetSdk 36, minSdk 24.
- 6.2 의 기기 10종 화면에서 가로 넘침이 없고, 폭 600dp 이상에서는 2열로 배치된다.
- PC exe 는 폭 460px 에서 지금과 같은 1열 화면이며, 아이콘·로고만 새 아이콘으로 바뀐다.
- `store/` 의 이미지가 Play 등록 규격을 만족하고, `docs/play-store.md` 만 보고 등록을 끝까지 진행할 수 있다.
- 기존 테스트 58개를 포함한 전체 테스트가 통과한다.

## 2. 기술 스택 (추가분)

| 영역 | 선택 |
|---|---|
| 안드로이드 래핑 | Capacitor 8.5 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) |
| 아이콘·시작 화면 생성 | `@capacitor/assets` 3.0 + `sharp`(SVG → PNG) |
| 빌드 도구 | JDK 21(Temurin), Android SDK platform 36 / build-tools 36.0.0 — 사용자 폴더에 설치 완료, `JAVA_HOME`·`ANDROID_HOME` 사용자 환경변수 설정됨 |

- 새 패키지도 모두 `devDependencies` 로 설치한다(electron-builder 가 exe 에 node_modules 를 넣지 않게 하는 기존 원칙 유지).
- Capacitor 8 기본값: compileSdk·targetSdk 36, minSdk 24, AGP 8.13, Gradle 8.14 — Play 의 신규 앱 요건(2026-08-31부터 API 36)을 만족한다.

## 3. 폴더 구조 (추가·변경분)

```
step-up-savings/
├─ capacitor.config.ts        앱 ID·이름·시스템 바 설정
├─ android/                   `cap add android` 로 생성한 안드로이드 프로젝트 (커밋, 빌드 산출물은 자체 .gitignore 로 제외)
│  └─ keystore.properties     업로드 키 정보 (사용자가 만듦, git 제외)
├─ assets/icon.svg            아이콘 원본 (시안 B, 108 단위 적응형 아이콘 좌표, 레이어 id: background / foreground)
├─ assets/*.png               scripts/icons.mjs 가 만드는 @capacitor/assets 입력 이미지
├─ build/icon.png             exe 아이콘 512px (electron-builder 가 자동 사용)
├─ src/assets/logo.svg        앱 화면 왼쪽 위 로고 (아이콘과 같은 그림, 보이는 72 단위만)
├─ store/                     Play 등록 이미지
├─ scripts/icons.mjs          아이콘 원본 → 모든 PNG·로고 생성
├─ scripts/android.mjs        cap sync + gradle 빌드 + release/ 로 복사
├─ scripts/screenshot.cjs     (변경) 기기 프리셋, 가로 넘침 검사
├─ scripts/store-assets.cjs   Play 스크린샷·대표 이미지 생성
├─ docs/play-store.md         Google Play 등록 가이드
└─ docs/privacy-policy.md     개인정보처리방침 문안
```

### npm 스크립트 (추가)

| 스크립트 | 동작 |
|---|---|
| `npm run icons` | `assets/icon.svg` 로 모든 아이콘 PNG·로고를 다시 만든다 |
| `npm run android:apk` | 웹 빌드 → `cap sync android` → `assembleDebug` → `release/증액저축-debug.apk` |
| `npm run android:release` | 웹 빌드 → `cap sync android` → `bundleRelease`·`assembleRelease` → `release/증액저축.aab`, `release/증액저축.apk`. `android/keystore.properties` 가 없으면 만드는 방법을 안내하고 실패한다 |
| `npm run store` | `store/` 의 스크린샷·대표 이미지를 다시 만든다 |
| `npm run shot -- --device <id\|all>` | 기기 프리셋으로 화면을 찍고 가로 넘침 여부를 표로 출력한다 |

## 4. 앱 정보

| 항목 | 값 |
|---|---|
| 패키지명(applicationId) | `kr.biblekang.stepupsavings` — 영어 이름 bible + 성 kang, 전부 소문자. **Play 에 올린 뒤에는 바꿀 수 없다** |
| 홈 화면 이름 | `증액저축` |
| Play 등록 제목 | `증액저축 계산기` |
| 버전 | `package.json` 의 version 하나로 관리. 이번에 `1.0.0` 으로 올린다(exe·안드로이드 공통) |
| versionName / versionCode | build.gradle 이 package.json 에서 읽는다. versionCode = 주×10000 + 부×100 + 수 (1.0.0 → 10000), 버전을 올리면 자동으로 커진다 |
| 화면 방향 | 고정하지 않음 (Android 16 은 600dp 이상 화면에서 방향 고정을 무시하므로 모든 방향을 지원해야 함) |
| 권한 | Capacitor 기본값(INTERNET)만 둔다. 앱 내부 페이지를 WebView 로 띄우는 데 쓰이며, 앱은 외부 네트워크로 아무것도 보내지 않는다 |
| 데이터 | 기존과 같이 WebView localStorage(`step-up-savings/v1`). 안드로이드 자동 백업 대상이라 새 폰으로 옮기면 복원될 수 있음. 서버 전송 없음 |

`capacitor.config.ts`:

```ts
const config: CapacitorConfig = {
    appId: 'kr.biblekang.stepupsavings',
    appName: '증액저축',
    webDir: 'dist',
    backgroundColor: '#f6f2ea',
    plugins: {
        SystemBars: { insetsHandling: 'css', style: 'LIGHT' }, // 밝은 바탕 위 진한 상태바 아이콘
    },
}
```

## 5. 아이콘 (시안 B — 쌓이는 동전)

- 그림: 진한 초록 대각선 그라데이션(#2a9b6f → #11553a) 바탕 위에 금색 동전 더미 2·4·6개와 아이보리 상승 화살표.
  시안 페이지(https://claude.ai/artifact/TVcrdQkUeV31uRpD5YsZ6t)의 B 와 같은 좌표를 쓴다.
- 좌표계: 108×108 적응형 아이콘 단위. 핵심 그림은 중심 반지름 33 안(어떤 마스크에서도 보이는 안전 영역)에 둔다.
- 원본 하나(`assets/icon.svg`)에서 `npm run icons` 가 만드는 것:

| 파일 | 크기 | 용도 |
|---|---|---|
| `assets/icon-foreground.png` | 1024 | 적응형 아이콘 전경(투명 바탕) |
| `assets/icon-background.png` | 1024 | 적응형 아이콘 배경(초록 그라데이션) |
| `assets/icon-only.png` | 1024 | 구형 안드로이드용 단일 아이콘 |
| `assets/splash.png`, `assets/splash-dark.png` | 2732 | 시작 화면(아이보리 바탕 가운데 아이콘) |
| `build/icon.png` | 512 | exe 아이콘(둥근 사각, 모서리 투명) |
| `store/icon-512.png` | 512 | Play 아이콘(정사각, 모서리는 Play 가 둥글게 처리) |
| `src/assets/logo.svg` | 벡터 | 앱 화면 왼쪽 위 로고(보이는 72 단위만 잘라낸 같은 그림) |

- 이어서 `npx capacitor-assets generate --android` 로 안드로이드 mipmap·splash 리소스를 만든다.
- 앱 헤더의 기존 막대 3개 로고(BrandMark)는 `logo.svg` 로 바꾼다(28px, 둥근 사각).

## 6. 화면 크기 대응

### 6.1 배치 규칙

| 조건 | 배치 |
|---|---|
| 기본 (폭 600dp 미만) | 지금과 같은 1열. 입력칸은 칸 폭이 140px 이상이면 2칸, 아니면 1칸으로 자동 배치 |
| 폭 400dp 미만 | 바깥 여백 12px, 카드 안쪽 여백 16px 로 줄인다 |
| 폭 600dp 이상 | **2열**: 왼쪽 = 입력·요약·플랜 삭제, 오른쪽 = 결과 카드·차트. 전체 최대 폭 1080px 가운데 정렬 |
| 높이 500dp 미만 (휴대폰 가로) | 상단 헤더 고정(sticky)을 풀어 화면을 덜 가린다 |
| 요약 카드 안쪽 폭 340px 미만 | 차액을 한 줄 전체로, 남은 개월·다음 월급날은 아랫줄 (360dp 폰에서 `100,000,0…` 처럼 잘리던 문제) |
| 결과 표가 카드보다 넓을 때 | 표만 카드 안에서 가로 스크롤 (페이지 전체는 가로로 넘치지 않음) |

- 1열일 때 순서는 지금과 같다: 입력 → 요약 → 결과 → 차트 → 플랜 삭제.
- 2열은 왼쪽:오른쪽 = 5:6 비율, 두 열 모두 위쪽 정렬.

### 6.2 확인할 기기 (CSS px = dp, 삼성 기본 화면 배율 가정 추정치)

| id | 기기·상태 | 화면(px) | 뷰포트(dp) | 기대 배치 |
|---|---|---|---|---|
| s26 | 갤럭시 S26 | 1080×2340 | 360×780 | 1열 |
| s26-ultra | 갤럭시 S26 울트라 | 1080×2340(FHD+ 기본) | 384×832 | 1열 |
| flip8 | 플립8 메인 6.9" | 1080×2520 | 411×960 | 1열 |
| flip8-cover | 플립8 커버 4.1" | 948×1048 | 361×399 | 1열, 헤더 고정 해제 |
| fold8-cover | 폴드8 커버 5.5" | 1248×1972 | 475×751 | 1열 |
| fold8-open | 폴드8 펼침 7.6" 4:3 가로 | 2448×1848 | 933×704 | 2열 |
| fold8-open-portrait | 폴드8 펼침 세로로 돌림 | 1848×2448 | 704×933 | 2열 |
| fold8u-cover | 폴드8 울트라 커버 6.5" 21:9 | 1080×2520 | 411×960 | 1열 |
| fold8u-open | 폴드8 울트라 펼침 8.0" | 2256×2504 | 859×954 | 2열 |
| phone-landscape | 휴대폰 가로 | 2340×1080 | 780×360 | 2열, 헤더 고정 해제 |

해상도 출처: GSMArena 폴드8·폴드8 울트라·플립8 사양(2026-07-22 출시). dp 값은 추정이며, 배치는 고정 크기가 아니라 폭·높이 조건으로 동작하므로 실제 dp 가 조금 달라도 같은 결과가 나온다.

### 6.3 안전 영역 (edge-to-edge)

- Android 15+ 는 앱이 화면 전체(상태바·내비게이션 바 아래까지)를 쓴다. Capacitor 8 SystemBars 가 넣어 주는 CSS 변수로 여백을 준다.
  `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` (bottom·left·right 동일).
- 헤더 위쪽 여백 = 16px + 위쪽 inset (헤더 배경이 상태바 뒤까지 이어진다), 페이지 아래 여백 = 28px + 아래쪽 inset, 좌우 여백 = 기본 여백 + 좌우 inset(가로 모드의 카메라 구멍).
- `index.html` viewport 에 `viewport-fit=cover` 를 더한다.
- PC(Electron)에서는 변수가 없어 0 이 되므로 지금과 같다.

### 6.4 터치 대응

- `pointer: coarse` 에서 탭·`+` 버튼·플랜 삭제 버튼 높이 40px 이상, "오늘로" 링크는 터치 영역을 넓힌다.
- 마우스 올림(hover) 효과는 `hover: hover` 인 기기에서만 적용한다.
- 탭할 때 파란 강조 대신 `:active` 로 살짝 눌린 표시를 한다.
- 차트: 연도 칸을 **탭(클릭)하면** 그 해 금액 라벨을 보여 주고 막대를 진하게 표시한다. 다시 탭하면 해제. 라벨을 솎아낸 해도 볼 수 있다. PC 에서도 클릭으로 같게 동작하고, 기존 마우스 툴팁도 유지한다.
- 금액 칸은 숫자 키패드, 날짜·월급날은 안드로이드 기본 선택 창을 쓴다(이미 그렇게 되어 있음).

## 7. 빌드·서명

- `scripts/android.mjs` 가 `npx cap sync android` 후 `android/gradlew.bat` 를 실행하고 산출물을 `release/` 로 복사한다.
- 서명: `android/keystore.properties`(storeFile, storePassword, keyAlias, keyPassword)가 있으면 release 빌드에 적용한다. 파일과 `*.jks`·`*.keystore` 는 git 에서 제외한다.
- 업로드 키는 사용자가 `keytool` 로 직접 만들고 보관한다(가이드에 명령어 수록). 개발 중 검증은 임시 키로 하고 끝나면 지운다.
- PC exe 빌드(`npm run build`)는 그대로이며 `build/icon.png` 를 아이콘으로 쓴다.

## 8. Play 등록 준비물

| 파일 | 규격 |
|---|---|
| `store/icon-512.png` | 512×512 PNG |
| `store/feature-graphic.png` | 1024×500 — 아이콘 + "증액저축 계산기" + 한 줄 소개 |
| `store/screenshots/phone-1~4.png` | 1080×1920 (9:16). ① 입력·요약 ② 균등·증액 결과 ③ 연도별 표·차트 ④ 플랜 여러 개(탭) |
| `store/screenshots/tablet-1~2.png` | 1920×1080 (16:9) — 2열 화면, 대화면 기기용(선택 항목) |

- 스크린샷의 값은 **가상의 예시**(목표 1억·현재자산 3,000만 원 등)로 한다. 사용자의 실제 자산 값은 쓰지 않는다.
- `docs/play-store.md` (한국어) 목차: 준비물 → 개발자 계정(25달러, 신분 확인, 개인 계정 비공개 테스트 12명·14일) → 업로드 키 만들기·백업 → `npm run android:release` → 앱 만들기 → 앱 콘텐츠 항목별 답변(개인정보처리방침, 광고 없음, 콘텐츠 등급, 타겟 연령 18세 이상, 데이터 보안 "수집·공유 없음", 금융 기능 해당 없음) → 스토어 등록정보(제목·짧은 설명·자세한 설명 초안, 카테고리 금융, 이미지 파일 대응표, 공개 연락 이메일) → 비공개 테스트 → 프로덕션 신청·심사 → **출시 후 관리**(버전 올려 업데이트 올리기, 매년 8월 말 대상 API 상향 대응, 리뷰·통계·비정상 종료 확인, 계정 유지 조건 — 연락처 인증·180일 내 Console 접속, 업로드 키 분실 시 재설정, 앱 게시 중단).
- 연락 이메일: Play 등록정보에 **공개되는 연락 이메일이 필수**이고, 개인정보처리방침에도 문의처가 들어간다. 개인·회사 메일 대신 앱 전용 Gmail 을 새로 만들어 두 곳에 같이 쓰도록 안내한다.
- `docs/privacy-policy.md`: 수집하는 개인정보 없음, 입력값은 기기 안에만 저장. 노션·구글 사이트 등에 그대로 붙여 게시할 수 있는 문안. 문의 연락처는 사용자가 게시할 때 직접 채우도록 `[연락처 이메일]` 로 비워 둔다(개인 연락처를 임의로 공개 문서에 넣지 않음).

## 9. 테스트·검증

- 단위 테스트: 기존 58개 + 차트 탭 선택 시 라벨 표시 규칙(`chartLabels` 에 선택한 연도 반영).
- 기기 화면 검사: `npm run shot -- --device all` 이 6.2 의 10종을 터치 기기로 흉내 내(가상 inset 위 28px·아래 24px 포함) 찍고, 각 기기의 가로 넘침 여부·열 개수를 출력한다. 넘침 0, 열 개수가 표의 기대값과 같아야 한다.
- 안드로이드 빌드: `npm run android:apk` 성공, `aapt2 dump badging` 으로 패키지·이름·SDK 확인, 임시 키로 `android:release` 성공 후 `apksigner verify` 통과.
- PC: `npm run build` 성공, 460px 화면이 기존과 같은지 스크린샷으로 확인.
- 실기기: 사용자가 apk 를 폰에 설치해 확인한다(제 쪽에서는 실기기를 다룰 수 없음).

## 10. 범위 밖

iOS, 다크 모드, Play Console 실제 업로드(사용자 계정 필요), 앱 내 업데이트 알림, 위젯·알림, 플립 커버 화면에서 앱 실행 설정(삼성 Good Lock 필요), 에뮬레이터 설치.
