# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

증액저축 계산기 — 목표금액까지 "균등 저축"과 "해마다 늘리는 증액 저축"의 월 저축액을 계산한다.
React 19 + Vite 8 + TypeScript 6 로 만든 **웹 화면 하나(dist/)**를 두 가지로 배포한다.

- PC: Electron 44 portable exe → `release/증액저축계산기.exe`
- 안드로이드: Capacitor 8 → `release/증액저축-debug.apk`, 서명 빌드 `release/증액저축.aab`·`증액저축.apk`

사용자와는 한국어로 대화하고, 코드 주석·문서도 한국어로 쓴다. 브랜치·병합·PR 같은 git 선택지를 물을 때는 용어만 늘어놓지 말고 각 선택이 실제로 무엇을 하는지 쉬운 말로 설명한다.

## 지켜야 할 규칙

- git 커밋 메시지에 `Co-Authored-By` 줄을 넣지 않는다.
- 코드 스타일: 들여쓰기 4칸, 세미콜론 없음, 작은따옴표 (lint 도구 없음 — 타입 검사는 `npx tsc -b`).
- npm 패키지는 모두 `devDependencies` 로 설치한다. electron-builder 는 `dependencies` 를 exe 에 넣으므로, Vite 가 번들하는 이 앱은 의존성을 devDependencies 에만 둔다.
- 금액은 원 단위 정수이고 모든 월 저축액은 `Math.ceil`(1원 단위 올림). 날짜는 `'YYYY-MM-DD'` 문자열을 `{y, m, d}` 정수로만 비교한다(`Date` 비교 금지).
- 안드로이드 패키지명 `kr.biblekang.stepupsavings` 는 Play 에 올린 뒤 바꿀 수 없다. `capacitor.config.ts` 의 `server.androidScheme: 'https'` 도 바꾸면 안 된다 — WebView 주소가 바뀌면 저장된 플랜(localStorage)을 못 읽는다.
- 업로드 키(`android/keystore.properties`, `*.jks`)는 git 에서 제외되어 있다. 절대 커밋하지 않는다.

## 명령어

```bash
npm test                                    # Vitest 전체 (src/**/*.test.ts, node 환경 — DOM 테스트 없음)
npx vitest run src/lib/savings.test.ts      # 파일 하나
npx vitest run -t "msUntilNextDay"          # 이름으로 하나
npx tsc -b                                  # 타입 검사
npm run dev                                 # 브라우저에서 화면 개발
npm run app                                 # 빌드 후 Electron 창으로 실행
npm run build                               # PC exe 갱신 (실행 중인 exe 는 먼저 닫아야 덮어쓸 수 있음)
npm run android:apk                         # 테스트용 apk
npm run android:release                     # Play 업로드용 aab + 직접 전달용 apk (android/keystore.properties 필요)
npm run icons                               # assets/icon.svg → exe·Play·앱 로고·안드로이드 런처 아이콘·시작 화면
npm run store                               # Play 등록 이미지(store/) 다시 만들기
npm run shot -- --device all                # 휴대폰·폴드 화면 자동 검사 (기대와 다르면 종료 코드 1)
npm run shot -- .shots/out.png [seed.json]  # PC 창(460×820) 스크린샷
```

화면(CSS·컴포넌트)을 바꾼 뒤에는 `npx vite build` 후 `npm run shot -- --device all` 을 돌린다. 기기 11종 × 데이터 3가지(기본·`scripts/seeds/stress.json`·`big.json`)의 열 개수, 헤더 고정, 가로 넘침, 안전 영역 여백, `…` 잘림을 검사하고, 폴드를 켠 채로 펼치기와 PC 탭 마우스 올림도 검사한다. 스크린샷은 `.shots/devices/`(git 제외)에 남는다.

## Claude Code 셸에서 주의할 환경

- 이 셸에는 `ELECTRON_RUN_AS_NODE=1` 이 설정되어 있을 수 있다. 그러면 electron.exe 가 Node 로 실행되므로 Electron 을 띄우는 명령(`npm run app/shot/store/build`)은 Bash 에서 `env -u ELECTRON_RUN_AS_NODE npm run …` 로 실행한다. (배포된 exe 는 RunAsNode 퓨즈를 꺼서 영향 없음.)
- `NoDefaultCurrentDirectoryInExePath=1` 이라 현재 폴더의 `.bat` 을 이름만으로 못 부른다 — `scripts/android.mjs` 는 gradlew 를 전체 경로로 부른다.
- JDK 21(Temurin, `%LOCALAPPDATA%\Programs\Temurin\jdk-21.0.12.1+1`)과 Android SDK 36(`%LOCALAPPDATA%\Android\Sdk`)은 사용자 환경변수 `JAVA_HOME`·`ANDROID_HOME` 로 잡혀 있다. 셸에 없으면 빌드 명령 앞에서 export 한다.
- 프로젝트 경로에 한글(`찡`)이 있어 `android/gradle.properties` 에 `android.overridePathCheck=true` 를 둔다.
- 작업 파일 중 CRLF 줄바꿈인 것이 많다(git autocrlf). 여러 줄 치환은 sed 보다 편집 도구가 안전하다.

## 구조 (여러 파일을 봐야 알 수 있는 큰 그림)

**계산·상태는 React 와 무관한 순수 함수**(`src/lib/`)이고 모두 단위 테스트가 있다. 컴포넌트는 이 함수들을 화면에 연결만 한다.

- `savings.ts` — 남은 개월 수 = `현재날짜 < 그 달 월급날 ≤ 완료날짜` 인 월급날 수(그 달에 없는 날은 말일). 균등 = `ceil(차액 / 개월)`. 증액 = 월급날이 있는 첫 연도를 첫해로 `x = ceil((차액 − 증액액 × Σ i·m_i) / Σ m_i)`, i 번째 해는 `x + i × 증액액`. 상태는 `invalid / achieved / noMonths / ok`(+ `stepUp.ok=false` 는 증액액이 너무 큼).
- `plans.ts` — 플랜 모델과 추가·수정·삭제 전이, 저장값 검증(`parseState`: 타입·범위·중복 id 걸러 냄). `hooks/usePlans.ts` 가 localStorage 키 `step-up-savings/v1` 로 저장한다. `currentDate: null` 은 "항상 오늘".
- `hooks/useToday.ts` — 앱이 다시 보이거나 자정이 지나면 오늘 날짜를 새로 읽는다(휴대폰은 백그라운드에서 다시 열리므로).
- `format.ts`(콤마·한글 단위·커서 위치), `chart.ts`(막대가 많을 때 라벨 솎아내기·점선과 겹치는 라벨 위치), `wheel.ts`(탭 줄 세로 휠 → 가로 스크롤).

**반응형 배치는 CSS 만으로**(`src/index.css` 끝의 "휴대폰·폴드 대응"):
- `App.tsx` 의 `.col-input`(입력·요약·삭제) / `.col-result`(결과·차트) 상자는 600px 미만에서 `display: contents` 로 사라져 한 줄로 쌓이고(삭제는 `order` 로 맨 아래), 600px 이상에서 5:6 두 열이 된다. 그리드 열은 `minmax(0, 1fr)` — `auto` 면 큰 금액 표 때문에 화면 밖으로 넘친다.
- 높이 500px 미만이면 헤더 고정 해제, `pointer: coarse` 에서 터치 크기 확대, 마우스 올림 효과는 `@media (hover: hover)` 안에만 둔다(선택된 탭은 `:not([aria-selected='true'])` 로 제외).
- 안전 영역은 Capacitor SystemBars(`insetsHandling: 'css'`)가 넣는 `--safe-area-inset-*` 를 `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` 형태로 **각 규칙에서 직접** 쓴다. PC 에서는 0.
- 요약 카드는 컨테이너 쿼리(390px 미만이면 차액을 한 줄 전체로), 금액은 `…` 로 숨기지 않고 줄바꿈한다. 결과 표는 `.table-scroll` 안에서만 가로 스크롤.

**PC(Electron)**: `electron/main.cjs` — 창 하나(460×820, 작업 영역에 맞춤, 최소 400×640), 단일 실행 잠금, sandbox. electron-builder 설정은 `package.json` 의 `build`(portable, `files` 는 dist·electron 만, `build/icon.png` 아이콘, runAsNode 퓨즈 끔). 데이터는 `%APPDATA%\증액저축계산기`.

**안드로이드(Capacitor)**: `android/` 는 커밋 대상. `app/build.gradle` 이 package.json 의 version 으로 versionName/versionCode(주×10000 + 부×100 + 수)를 정하고, `keystore.properties` 가 있으면 release 에 서명한다. `MainActivity` 가 `EdgeToEdge.enable`, 테마는 항상 밝게(창 바탕·시작 화면 #F6F2EA). 런처 아이콘·시작 화면은 `scripts/icons.mjs` 가 직접 만든다 — `@capacitor/assets` 는 흐리고 작게 나와서 쓰지 않는다.

**개발용 캡처 도구**(Electron 메인 프로세스, exe 에 미포함): `scripts/capture-kit.cjs` 의 `emulate()` 는 창에 첫 페이지를 띄운 **뒤에** CDP 디버거를 붙인다(먼저 붙이면 멈춤). 캡처는 `capturePage()` — 숨은 창에서 CDP 스크린샷은 스크롤 뒤 멈춘다. 결과 픽셀은 뷰포트 × 프로세스 화면 배율이라, `store-assets.cjs` 는 `force-device-scale-factor` 를 고정한 프로세스를 배율별로 따로 띄운다.

**배포(GitHub Releases)**: `v*` 태그를 push 하면 `.github/workflows/release.yml` 이 태그 = `package.json` version 확인·타입 검사·테스트 후 exe(windows-latest)와 apk(ubuntu-latest)를 만들어 Release 에 올린다. 첨부 파일 이름은 영문(`step-up-savings-v1.2.3-windows.exe`, `step-up-savings-v1.2.3.apk`, 서명 없으면 `…-test.apk`) — GitHub 이 한글을 지운다. Secrets `ANDROID_KEYSTORE_BASE64` 등이 있으면 서명 apk, 없으면 debug apk. 리눅스에서 돌리므로 `android/gradlew` 는 실행 권한(100755)을 유지한다.

## 문서

- 설계 스펙: `docs/superpowers/specs/` (PC 버전 / 안드로이드 버전), 구현 계획: `docs/superpowers/plans/`
- Google Play 등록·출시 후 관리 가이드: `docs/play-store.md`, 개인정보처리방침 문안: `docs/privacy-policy.md`
