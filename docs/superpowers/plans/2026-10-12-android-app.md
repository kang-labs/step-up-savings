# 증액저축 안드로이드 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 같은 React 화면을 Capacitor 8 로 감싼 안드로이드 앱(`kr.biblekang.stepupsavings`)을 만들고, 휴대폰·플립8·폴드8·폴드8 울트라 화면에 맞게 반응형으로 바꾸며, 새 아이콘과 Google Play 등록 자료·가이드까지 준비한다.

**Architecture:** 웹 화면(dist)은 하나이고 PC(Electron)와 안드로이드(Capacitor WebView)가 같은 결과물을 띄운다. 화면 대응은 CSS(폭 600px 이상 2열, 높이 500px 미만 헤더 고정 해제, 안전 영역 변수, 터치 미디어 쿼리)로만 한다. 검증은 Electron 숨은 창에 Chrome DevTools 기기 흉내(CDP)를 걸어 기기 11종의 열 개수·헤더 고정·가로 넘침·안전 영역을 자동 검사하는 스크립트로 한다. 아이콘은 SVG 원본 하나에서 sharp 로 모든 PNG 를 만들고, 안드로이드 리소스는 `@capacitor/assets` 가 만든다.

**Tech Stack:** Capacitor 8.5 · Android SDK 36 · JDK 21 · @capacitor/assets 3.0 · sharp 0.35 · 기존 React 19 / Vite 8 / Vitest 5 / Electron 44

**Spec:** `docs/superpowers/specs/2026-10-12-android-app-design.md` (기반 스펙: `docs/superpowers/specs/2026-10-12-step-up-savings-design.md`)

**Project root:** `C:\Users\PIX-BIBLE\Desktop\bible\찡\01.project\step-up-savings` — 모든 경로와 명령은 이 폴더 기준이다.

## Global Constraints

- 코드 스타일: 들여쓰기 4칸, 세미콜론 없음, 작은따옴표, 주석은 한국어.
- 새 npm 패키지는 모두 `devDependencies` (exe 에 node_modules 가 들어가지 않게).
- 버전: @capacitor/core·cli·android `^8.5.3`, @capacitor/assets `^3.0.5`, sharp `^0.35.5`.
- 패키지명 `kr.biblekang.stepupsavings`, 홈 화면 이름 `증액저축`, Play 제목 `증액저축 계산기`. package.json version `1.0.0`. versionCode = 주×10000 + 부×100 + 수.
- compileSdk·targetSdk 36, minSdk 24 — Capacitor 8 템플릿 값(`android/variables.gradle`)을 바꾸지 않는다.
- 배치 기준: 폭 600px 이상 2열(왼쪽 5 : 오른쪽 6, 최대 폭 1080px), 폭 400px 미만 여백 축소, 높이 500px 미만 헤더 고정 해제, 요약 카드 안쪽 폭 340px 미만 차액 한 줄.
- 안전 영역은 `var(--safe-area-inset-<side>, env(safe-area-inset-<side>, 0px))` 를 쓰는 규칙에서 직접 쓴다(중간 변수에 담지 않음 — Capacitor 가 변수를 어느 요소에 넣어도 상속되게).
- PC exe 화면(460×820)은 로고 외에는 지금과 같아야 한다.
- Play 스크린샷에는 가상의 예시 값만 쓴다. 사용자의 실제 자산 값을 쓰지 않는다.
- 업로드 키·`android/keystore.properties` 는 절대 커밋하지 않는다. 검증용 임시 키는 끝나면 지운다.
- 이 작업 셸은 설치 전에 열려서 사용자 환경변수를 모른다. 안드로이드 빌드 명령 앞에는 항상
  `export JAVA_HOME="C:/Users/PIX-BIBLE/AppData/Local/Programs/Temurin/jdk-21.0.12.1+1" ANDROID_HOME="C:/Users/PIX-BIBLE/AppData/Local/Android/Sdk"` 를 붙인다.
- Electron 을 띄우는 명령(`npm run shot`, `npm run store`, `npm run app`)은 이 셸의 `ELECTRON_RUN_AS_NODE=1` 때문에 `env -u ELECTRON_RUN_AS_NODE` 를 앞에 붙인다.
- CDP 기기 흉내는 창에 첫 페이지를 띄운 **뒤에** 디버거를 붙인다(먼저 붙이면 Electron 이 멈춤 — 사전 시험으로 확인함).
- git 커밋 메시지에 `Co-Authored-By` 줄을 넣지 않는다.

## Review Focus

스펙이 직접 말하지 않지만 실제 폰에서 가장 먼저 부딪힐 상황과, 이를 고정하는 검사가 들어간 태스크:

1. **앱을 켠 채로 폴드를 펼치거나 접을 때**(안드로이드는 화면을 다시 만들지 않고 크기만 바꿈) → 다시 읽지 않아도 1열↔2열이 바로 바뀐다. (Task 3 `checkUnfold`, Task 4 에서 통과)
2. **아주 긴 플랜 이름·최대 금액(999,999,999,999) 같은 극단 입력을 좁은 화면에서** → 페이지가 가로로 넘치지 않는다(긴 표는 표만 스크롤). (Task 3 `scripts/seeds/stress.json` 검사, Task 4 에서 통과)
3. **삼성 "화면 크게 보기"로 폭이 320dp 까지 줄어든 폰** → 1열, 넘침 없음. (Task 3 프리셋 `small-320`)
4. **edge-to-edge 로 상태바 아래까지 그려질 때** → 헤더 글자가 상태바에 가리지 않는다(위 여백 ≥ 16px + inset). (Task 3 `headerPadTop` 검사)
5. **휴대폰 가로·플립 커버처럼 높이가 낮을 때** → 헤더 고정이 풀려 화면을 덮지 않는다. (Task 3 `sticky` 기대값)

---

### Task 1: Capacitor 안드로이드 프로젝트 + 디버그 apk

**Files:**
- Create: `capacitor.config.ts`, `scripts/android.mjs`, `android/` (`npx cap add android` 가 생성)
- Modify: `package.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `android/app/build.gradle`, `android/app/src/main/res/values/styles.xml`, `android/gradle.properties`

**Interfaces:**
- Consumes: 기존 `dist/` (vite build 결과)
- Produces:
  - `npm run android:apk` → `release/증액저축-debug.apk`
  - `scripts/android.mjs` (`apk` 모드. Task 5 가 `release` 모드를 더한다)
  - `android/app/build.gradle` 이 package.json version 으로 versionName/versionCode 를 정한다

- [ ] **Step 1: Capacitor 설치**

Run: `npm install -D @capacitor/core@^8.5.3 @capacitor/cli@^8.5.3 @capacitor/android@^8.5.3`
Expected: `added N packages`, package.json `devDependencies` 에 세 패키지.

- [ ] **Step 2: 설정 파일** — `capacitor.config.ts`

```ts
import type { CapacitorConfig } from '@capacitor/cli'

// 안드로이드 앱 설정. 패키지명(appId)은 Play 에 올린 뒤에는 바꿀 수 없다.
const config: CapacitorConfig = {
    appId: 'kr.biblekang.stepupsavings',
    appName: '증액저축',
    webDir: 'dist',
    backgroundColor: '#f6f2ea',
    plugins: {
        // 화면을 상태바·내비게이션 바 아래까지 쓰고(edge-to-edge) 그 높이를 --safe-area-inset-* CSS 변수로 넘긴다.
        // LIGHT = 밝은 바탕 위 진한 아이콘.
        SystemBars: { insetsHandling: 'css', style: 'LIGHT' },
    },
}

export default config
```

`tsconfig.node.json` 의 `"include": ["vite.config.ts"]` 를 `"include": ["vite.config.ts", "capacitor.config.ts"]` 로 바꾼다.

`index.html` 의 viewport 줄을 다음으로 바꾼다:
```html
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 3: package.json — 버전·스크립트**

`"version": "0.1.0"` → `"version": "1.0.0"`.
`"scripts"` 에 한 줄 추가(`"build"` 줄 위):
```json
        "android:apk": "tsc -b && vite build && node scripts/android.mjs apk",
```

- [ ] **Step 4: 안드로이드 프로젝트 생성**

Run: `npx tsc -b && npx vite build && npx cap add android`
Expected: `✔ Adding native android project`, `android/` 생성. 확인:
```bash
grep -n "applicationId\|namespace" android/app/build.gradle
grep -n "app_name\|title_activity_main" android/app/src/main/res/values/strings.xml
```
→ `kr.biblekang.stepupsavings` 두 곳, `증액저축` 두 곳.

- [ ] **Step 5: 버전을 package.json 에서 읽기** — `android/app/build.gradle`

`apply plugin: 'com.android.application'` 다음 줄에 추가:
```groovy

// 앱 버전은 package.json 의 version 하나로 관리한다. versionCode = 주×10000 + 부×100 + 수 (1.0.0 → 10000)
def appPackage = new groovy.json.JsonSlurper().parse(rootProject.file('../package.json'))
def (verMajor, verMinor, verPatch) = appPackage.version.tokenize('.').collect { it as int }
```

`defaultConfig` 안의 두 줄
```groovy
        versionCode 1
        versionName "1.0"
```
을 다음으로 바꾼다:
```groovy
        versionCode verMajor * 10000 + verMinor * 100 + verPatch
        versionName appPackage.version
```

- [ ] **Step 6: 테마 — 항상 밝게, 시작 화면 바탕 아이보리** — `android/app/src/main/res/values/styles.xml`

`<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">` 를
```xml
    <!-- 앱 화면이 밝은 테마 하나라, 날짜 선택 창 같은 기본 창도 항상 밝게 -->
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">
```
로 바꾸고, `AppTheme.NoActionBarLaunch` 스타일 안의 `<item name="android:background">@drawable/splash</item>` 다음 줄에 추가:
```xml
        <item name="windowSplashScreenBackground">#F6F2EA</item>
```

- [ ] **Step 7: 한글 경로 허용** — `android/gradle.properties` 끝에 추가

```properties

# 프로젝트 경로(바탕 화면\찡\…)에 한글이 있어 Android Gradle Plugin 의 경로 검사를 끈다.
android.overridePathCheck=true
```

- [ ] **Step 8: 빌드 스크립트** — `scripts/android.mjs`

```js
// 안드로이드 빌드: 웹 결과물(dist)을 android/ 로 옮긴 뒤 gradle 로 apk 를 만들고 release/ 로 복사한다.
//   node scripts/android.mjs apk   테스트용 release/증액저축-debug.apk
// package.json 의 android:apk 가 웹 빌드 후 실행한다.
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const androidDir = join(root, 'android')
const outDir = join(root, 'release')
const outputs = join(androidDir, 'app', 'build', 'outputs')
const mode = process.argv[2]

function fail(message) {
    console.error(`\n${message}`)
    process.exit(1)
}

/** 셸을 거쳐 실행한다 (Windows 의 npx·gradlew.bat). */
function run(command, cwd) {
    execSync(command, { cwd, stdio: 'inherit' })
}

if (mode !== 'apk') fail('사용: node scripts/android.mjs apk')
if (!process.env.JAVA_HOME) fail('JAVA_HOME 이 없습니다. JDK 21 을 설치하고 새 터미널에서 다시 실행하세요.')

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
run('npx cap sync android', root)
mkdirSync(outDir, { recursive: true })

run(`${gradlew} assembleDebug`, androidDir)
copyFileSync(join(outputs, 'apk', 'debug', 'app-debug.apk'), join(outDir, '증액저축-debug.apk'))
console.log(`\n완료: ${join(outDir, '증액저축-debug.apk')}`)
```

- [ ] **Step 9: .gitignore** — 끝에 추가

```
# 안드로이드 업로드 키 (절대 커밋하지 않음)
android/keystore.properties
*.jks
*.keystore
```

- [ ] **Step 10: 디버그 apk 빌드**

첫 빌드는 Gradle 8.14.3 과 의존성을 내려받아 5~15분 걸릴 수 있다. 백그라운드로 돌리고 로그를 본다.
Run:
```bash
export JAVA_HOME="C:/Users/PIX-BIBLE/AppData/Local/Programs/Temurin/jdk-21.0.12.1+1" ANDROID_HOME="C:/Users/PIX-BIBLE/AppData/Local/Android/Sdk"
mkdir -p .shots
npm run android:apk > .shots/android-apk.log 2>&1; echo "exit=$?"; tail -20 .shots/android-apk.log
```
Expected: `BUILD SUCCESSFUL`, `완료: …\release\증액저축-debug.apk`, exit=0.

빌드가 경로 문제로 실패하면(로그에 `non-ASCII`, 또는 aapt2 가 경로를 못 찾는다는 오류) ASCII 경로의 연결(junction)을 거쳐 빌드하도록 `scripts/android.mjs` 의 `const root = process.cwd()` 줄을 다음으로 바꾸고 다시 실행한다:
```js
import { existsSync, realpathSync } from 'node:fs'  // 기존 node:fs import 에 합친다

// 프로젝트 경로에 한글이 있으면 Android 빌드 도구가 경로를 못 읽는 경우가 있어, ASCII 경로의 연결(junction)을 거쳐 빌드한다.
function asciiRoot(dir) {
    if (/^[\x20-\x7e]*$/.test(dir)) return dir
    const link = join(process.env.LOCALAPPDATA, 'step-up-savings-build')
    if (existsSync(link) && realpathSync(link) !== realpathSync(dir)) execSync(`rmdir "${link}"`)
    if (!existsSync(link)) execSync(`mklink /J "${link}" "${dir}"`)
    return link
}
const root = asciiRoot(process.cwd())
```

- [ ] **Step 11: apk 정보 확인**

Run:
```bash
"$ANDROID_HOME/build-tools/36.0.0/aapt2.exe" dump badging release/증액저축-debug.apk | grep -E "^package:|SdkVersion|application-label:"
```
Expected:
```
package: name='kr.biblekang.stepupsavings' versionCode='10000' versionName='1.0.0' …
minSdkVersion:'24'
targetSdkVersion:'36'
application-label:'증액저축'
```

- [ ] **Step 12: 테스트 · 커밋**

Run: `npm test`
Expected: 5 files, 58 tests passed.

```bash
git add capacitor.config.ts scripts/android.mjs package.json package-lock.json tsconfig.node.json index.html .gitignore android
git commit -m "feat: add Capacitor Android project and debug apk build"
```
`git status --short` 에 `android/app/build/`, `android/local.properties`, `android/app/src/main/assets/public` 가 보이지 않아야 한다(android/.gitignore 가 제외).

---

### Task 2: 새 아이콘 (시안 B — 쌓이는 동전)

**Files:**
- Create: `assets/icon.svg`, `scripts/icons.mjs`
- Generate: `assets/icon-foreground.png`, `assets/icon-background.png`, `assets/icon-only.png`, `assets/splash.png`, `assets/splash-dark.png`, `build/icon.png`, `store/icon-512.png`, `src/assets/logo.svg`, `android/app/src/main/res/**` 의 아이콘·시작 화면
- Modify: `package.json`, `src/App.tsx`, `src/index.css`

**Interfaces:**
- Consumes: Task 1 의 `android/` 프로젝트
- Produces:
  - `npm run icons`
  - `src/assets/logo.svg` (보이는 72 단위만 남긴 아이콘 — App 헤더와 Task 5 대표 이미지가 씀)
  - `store/icon-512.png`, `build/icon.png`(electron-builder 가 자동 사용)

- [ ] **Step 1: 설치**

Run: `npm install -D sharp@^0.35.5 @capacitor/assets@^3.0.5`
Expected: `added N packages`.

- [ ] **Step 2: 아이콘 원본** — `assets/icon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
    <!-- 증액저축 아이콘 (시안 B: 쌓이는 동전). 108×108 적응형 아이콘 단위, 핵심 그림은 중심 반지름 33 안. -->
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#2a9b6f"/>
            <stop offset="1" stop-color="#11553a"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffd36b"/>
            <stop offset="1" stop-color="#eaa634"/>
        </linearGradient>
    </defs>
    <g id="background">
        <rect width="108" height="108" fill="url(#bg)"/>
    </g>
    <g id="foreground">
        <!-- 동전 = 진한 옆면(1.4 아래) + 금색 윗면. 더미마다 아래 동전부터 그린다. 더미 2·4·6개 -->
        <rect x="30" y="70.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="30" y="69" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="30" y="65.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="30" y="64" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="47" y="70.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="47" y="69" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="47" y="65.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="47" y="64" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="47" y="60.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="47" y="59" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="47" y="55.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="47" y="54" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="64" y="70.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="64" y="69" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="64" y="65.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="64" y="64" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="64" y="60.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="64" y="59" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="64" y="55.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="64" y="54" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="64" y="50.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="64" y="49" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <rect x="64" y="45.4" width="14" height="4.6" rx="2.3" fill="#b87a17"/><rect x="64" y="44" width="14" height="4.6" rx="2.3" fill="url(#gold)"/>
        <!-- 상승 화살표 -->
        <path d="M32 50 L45 41 L54 46 L70 32" fill="none" stroke="#fbf7ef" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M62.5 31 L71.5 30.5 L71 39.5" fill="none" stroke="#fbf7ef" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
</svg>
```

- [ ] **Step 3: 이미지 생성 스크립트** — `scripts/icons.mjs`

```js
// 아이콘 원본(assets/icon.svg) 하나로 안드로이드·PC·Play·앱 로고용 이미지를 모두 만든다.
// 사용: npm run icons   (이 스크립트 다음에 capacitor-assets 가 안드로이드 리소스를 만든다)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const IVORY = '#f6f2ea'
const source = readFileSync('assets/icon.svg', 'utf8')

/** 레이어 하나를 뺀 SVG — 적응형 아이콘은 배경과 전경을 따로 넘긴다. */
const without = id => source.replace(new RegExp(`<g id="${id}">[\\s\\S]*?</g>`), '')
/** 마스크 없이 보이는 가운데 72 단위만 남긴 SVG — Play·exe·앱 로고처럼 그대로 보여 줄 곳에 쓴다. */
const visible = source.replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"')

/** SVG 를 size×size PNG 버퍼로 */
function render(svg, size) {
    return sharp(Buffer.from(svg.replace('<svg ', `<svg width="${size}" height="${size}" `))).png().toBuffer()
}

/** 모서리를 둥글게(반지름 = 크기 × ratio) 잘라 낸 PNG 버퍼 — 바깥은 투명 */
async function rounded(svg, size, ratio) {
    const r = Math.round(size * ratio)
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`)
    return sharp(await render(svg, size)).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

/** 아이보리 바탕 가운데에 둥근 아이콘을 둔 시작 화면 (안드로이드 11 이하용) */
async function splash(size) {
    const icon = await rounded(visible, Math.round(size * 0.22), 0.22)
    return sharp({ create: { width: size, height: size, channels: 4, background: IVORY } })
        .composite([{ input: icon, gravity: 'center' }])
        .png()
        .toBuffer()
}

for (const dir of ['assets', 'build', 'store', 'src/assets']) mkdirSync(dir, { recursive: true })

const outputs = {
    'assets/icon-foreground.png': render(without('background'), 1024),
    'assets/icon-background.png': render(without('foreground'), 1024),
    'assets/icon-only.png': render(visible, 1024),
    'assets/splash.png': splash(2732),
    'assets/splash-dark.png': splash(2732),
    'build/icon.png': rounded(visible, 512, 0.22),
    'store/icon-512.png': render(visible, 512),
}
for (const [file, buffer] of Object.entries(outputs)) {
    writeFileSync(file, await buffer)
    console.log(`wrote ${file}`)
}
writeFileSync('src/assets/logo.svg', visible)
console.log('wrote src/assets/logo.svg')
```

`package.json` `"scripts"` 에 추가(`"android:apk"` 줄 위):
```json
        "icons": "node scripts/icons.mjs && capacitor-assets generate --android",
```

- [ ] **Step 4: 생성 실행**

Run: `npm run icons`
Expected: `wrote …` 8줄, 이어서 capacitor-assets 가 android 리소스 생성 목록 출력. 확인:
```bash
ls android/app/src/main/res/mipmap-xxxhdpi/
cat android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
```
→ `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`, `ic_launcher_background.png`, 적응형 xml 이 전경·배경 이미지를 가리킨다.

이미지를 열어 본다: `assets/icon-only.png`, `build/icon.png`(모서리 투명), `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` — 시안 페이지의 B 와 같은 그림이어야 한다.

- [ ] **Step 5: 앱 헤더 로고 교체** — `src/App.tsx`, `src/index.css`

`src/App.tsx` 맨 위 import 들 앞에 추가:
```tsx
import logoUrl from './assets/logo.svg'
```
`<BrandMark />` 를 다음으로 바꾸고, 파일 아래의 `function BrandMark() { … }` 전체를 지운다:
```tsx
                    <img className="brand-mark" src={logoUrl} alt="" />
```

`src/index.css` 의
```css
.brand-mark {
    width: 22px;
    height: 22px;
    fill: var(--accent);
}
```
를 다음으로 바꾼다:
```css
.brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
}
```

- [ ] **Step 6: 확인**

Run: `npm test && npx tsc -b && npx vite build`
Expected: 58 passed, 타입 오류 0, 빌드 성공.

Run: `env -u ELECTRON_RUN_AS_NODE npm run shot -- .shots/task2-header.png`
Expected: 헤더 왼쪽에 둥근 초록 동전 아이콘 + "증액저축 계산기".

Run: `export JAVA_HOME="C:/Users/PIX-BIBLE/AppData/Local/Programs/Temurin/jdk-21.0.12.1+1" ANDROID_HOME="C:/Users/PIX-BIBLE/AppData/Local/Android/Sdk"; npm run android:apk > .shots/android-apk.log 2>&1; echo "exit=$?"` 후
`"$ANDROID_HOME/build-tools/36.0.0/aapt2.exe" dump badging release/증액저축-debug.apk | grep application-icon | tail -1`
Expected: exit=0, `…'res/mipmap-anydpi-v26/ic_launcher.xml'` (또는 같은 이름의 png).

Run: `env -u ELECTRON_RUN_AS_NODE npm run build > .shots/exe-build.log 2>&1; echo "exit=$?"; grep -c "default Electron icon is used" .shots/exe-build.log`
Expected: exit=0, `0` (기본 Electron 아이콘 문구가 없음).

- [ ] **Step 7: 커밋**

```bash
git add assets scripts/icons.mjs build/icon.png store/icon-512.png src/assets/logo.svg src/App.tsx src/index.css package.json package-lock.json android
git commit -m "feat: new coin-stack app icon for Android, Play and the PC exe"
```

---

### Task 3: 기기 화면 검사 도구 (먼저 실패 확인)

**Files:**
- Create: `scripts/capture-kit.cjs`, `scripts/seeds/stress.json`
- Modify (전체 교체): `scripts/screenshot.cjs`

**Interfaces:**
- Consumes: `dist/`, 화면의 `.app-header`, `.app-main` 클래스
- Produces:
  - `scripts/capture-kit.cjs`: `STORAGE_KEY`, `DIST`, `sleep(ms)`, `loadWithSeed(win, seed: string | null)`, `emulate(win, { width, height, scale = 1, mobile = true })`, `screenshot(win, file)`
  - `npm run shot -- --device <id|all> [--seed file] [--out dir]` — 기대와 다르면 종료 코드 1
  - 기존 `npm run shot -- <out.png> [seed.json]` (PC 모드) 그대로

- [ ] **Step 1: 공용 도구** — `scripts/capture-kit.cjs`

```js
// 개발용 화면 캡처 공용 도구 — Electron 메인 프로세스에서 require 한다. exe 에는 포함되지 않는다.
const fs = require('node:fs')
const path = require('node:path')

const STORAGE_KEY = 'step-up-savings/v1'
const DIST = path.join(__dirname, '..', 'dist', 'index.html')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** 저장값을 seed(PlansState JSON 문자열, null 이면 비움)로 바꾸고 앱을 다시 읽는다. */
async function loadWithSeed(win, seed) {
    const run = script => win.webContents.executeJavaScript(script)
    await run(
        seed === null
            ? `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`
            : `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(seed)})`,
    )
    const reloaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve))
    win.webContents.reloadIgnoringCache()
    await reloaded
    await run('document.fonts.ready.then(() => true)')
    await sleep(200)
}

/**
 * 터치 기기 흉내: 뷰포트 크기·배율을 고정하고 터치를 켠다((pointer: coarse)·(hover: none) 이 맞게 됨).
 * 창에 첫 페이지를 띄운 뒤에 불러야 한다 — 그 전에 디버거를 붙이면 Electron 이 멈춘다.
 * mobile: viewport 메타가 없는 정적 페이지(대표 이미지)를 찍을 때는 false.
 */
async function emulate(win, { width, height, scale = 1, mobile = true }) {
    const dbg = win.webContents.debugger
    if (!dbg.isAttached()) dbg.attach('1.3')
    await dbg.sendCommand('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile })
    await dbg.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 })
}

/** 지금 보이는 뷰포트를 기기 배율 그대로 PNG 로 저장한다 (emulate 한 창에서만). */
async function screenshot(win, file) {
    const { data } = await win.webContents.debugger.sendCommand('Page.captureScreenshot', { format: 'png' })
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
}

module.exports = { STORAGE_KEY, DIST, sleep, loadWithSeed, emulate, screenshot }
```

- [ ] **Step 2: 화면 캡처·검사** — `scripts/screenshot.cjs` 전체를 다음으로 교체

```js
// 개발용 화면 캡처 (exe 에는 포함되지 않음). 먼저 vite build 로 dist 를 만든다.
//
//   npm run shot -- <out.png> [seed.json]
//       PC 창 크기(460×820)로 찍는다. 화면보다 길면 out-2.png, out-3.png … 로 나눈다.
//   npm run shot -- --device <id|all> [--seed seed.json] [--out .shots/devices]
//       휴대폰·폴드 화면을 터치 기기로 흉내 내 찍고, 기기마다 열 개수·헤더 고정·가로 넘침·안전 영역을 검사한다.
//       all 이면 폴드를 켠 채로 펼치는 경우도 검사한다. 기대와 다른 것이 있으면 종료 코드 1.
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow } = require('electron')
const { DIST, loadWithSeed, emulate, screenshot, sleep } = require('./capture-kit.cjs')

const HEADER_OVERLAP = 120 // PC 모드: 고정 헤더에 가려진 부분이 다음 장에 다시 나오도록 겹쳐 찍는다.
const INSET = { top: 28, bottom: 24 } // 기기 모드: 상태바·내비게이션 바 높이 흉내(dp)

// 스펙 6.2 + 화면 크게 보기(320dp). 뷰포트는 삼성 기본 배율 가정 추정치(dp).
const DEVICES = {
    's26': { name: '갤럭시 S26', width: 360, height: 780, columns: 1, sticky: true },
    's26-ultra': { name: '갤럭시 S26 울트라', width: 384, height: 832, columns: 1, sticky: true },
    'flip8': { name: '플립8 메인', width: 411, height: 960, columns: 1, sticky: true },
    'flip8-cover': { name: '플립8 커버', width: 361, height: 399, columns: 1, sticky: false },
    'fold8-cover': { name: '폴드8 커버', width: 475, height: 751, columns: 1, sticky: true },
    'fold8-open': { name: '폴드8 펼침(가로)', width: 933, height: 704, columns: 2, sticky: true },
    'fold8-open-portrait': { name: '폴드8 펼침(세로)', width: 704, height: 933, columns: 2, sticky: true },
    'fold8u-cover': { name: '폴드8 울트라 커버', width: 411, height: 960, columns: 1, sticky: true },
    'fold8u-open': { name: '폴드8 울트라 펼침', width: 859, height: 954, columns: 2, sticky: true },
    'phone-landscape': { name: '휴대폰 가로', width: 780, height: 360, columns: 2, sticky: false },
    'small-320': { name: '화면 크게 보기 320dp', width: 320, height: 690, columns: 1, sticky: true },
}

function parseArgs(argv) {
    const args = { device: null, seed: null, out: null, positional: [] }
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--device') args.device = argv[++i]
        else if (argv[i] === '--seed') args.seed = argv[++i]
        else if (argv[i] === '--out') args.out = argv[++i]
        else args.positional.push(argv[i])
    }
    return args
}

const readSeed = file => (file ? fs.readFileSync(path.resolve(file), 'utf-8') : null)

/** PC 모드: 460×820 창 그대로, 길면 나눠 찍는다. */
async function shootDesktop(win, out, seed) {
    const run = script => win.webContents.executeJavaScript(script)
    await loadWithSeed(win, seed)
    const viewport = await run('window.innerHeight')
    const total = await run('document.documentElement.scrollHeight')
    const base = path.resolve(out).replace(/\.png$/i, '')
    fs.mkdirSync(path.dirname(base), { recursive: true })
    for (let page = 1, top = 0; ; page += 1, top += viewport - HEADER_OVERLAP) {
        await run(`window.scrollTo(0, ${top})`)
        await sleep(150)
        const file = page === 1 ? `${base}.png` : `${base}-${page}.png`
        fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG())
        console.log(`saved ${file}`)
        if (top + viewport >= total) break
    }
}

/** 지금 화면의 배치 상태 */
function inspect(win) {
    return win.webContents.executeJavaScript(`(() => {
        const header = getComputedStyle(document.querySelector('.app-header'))
        const main = getComputedStyle(document.querySelector('.app-main'))
        return {
            columns: main.gridTemplateColumns.split(' ').length,
            sticky: header.position === 'sticky',
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            headerPadTop: parseFloat(header.paddingTop),
            coarse: matchMedia('(pointer: coarse)').matches,
        }
    })()`)
}

/** 상태바·내비게이션 바 높이를 Capacitor 가 넣어 주는 변수로 흉내 낸다. */
async function setInsets(win) {
    await win.webContents.executeJavaScript(`(() => {
        const s = document.documentElement.style
        s.setProperty('--safe-area-inset-top', '${INSET.top}px')
        s.setProperty('--safe-area-inset-bottom', '${INSET.bottom}px')
    })()`)
    await sleep(100)
}

async function checkDevice(win, id, seed, outDir) {
    const d = DEVICES[id]
    await emulate(win, d)
    await loadWithSeed(win, seed)
    await setInsets(win)
    const got = await inspect(win)
    const problems = []
    if (got.columns !== d.columns) problems.push(`열 ${got.columns}개(기대 ${d.columns})`)
    if (got.sticky !== d.sticky) problems.push(`헤더 고정 ${got.sticky}(기대 ${d.sticky})`)
    if (got.overflow) problems.push('가로 넘침')
    if (got.headerPadTop < 16 + INSET.top) problems.push(`헤더 위 여백 ${got.headerPadTop}px(기대 ${16 + INSET.top} 이상)`)
    if (!got.coarse) problems.push('터치 흉내 안 됨')
    await screenshot(win, path.join(outDir, `${id}.png`))
    await win.webContents.executeJavaScript('window.scrollTo(0, document.documentElement.scrollHeight)')
    await sleep(150)
    await screenshot(win, path.join(outDir, `${id}-end.png`))
    return {
        기기: id,
        뷰포트: `${d.width}×${d.height}`,
        열: got.columns,
        헤더고정: got.sticky,
        넘침: got.overflow,
        결과: problems.length === 0 ? 'OK' : problems.join(', '),
    }
}

/** 폴드를 켠 채로 펼치기: 다시 읽지 않고 뷰포트만 커버 → 펼침으로 바꿔도 1열 → 2열이 되어야 한다. */
async function checkUnfold(win, seed) {
    await emulate(win, DEVICES['fold8-cover'])
    await loadWithSeed(win, seed)
    const before = (await inspect(win)).columns
    await emulate(win, DEVICES['fold8-open'])
    await sleep(300)
    const after = (await inspect(win)).columns
    return {
        기기: 'unfold',
        뷰포트: '475×751 → 933×704',
        열: `${before}→${after}`,
        헤더고정: '-',
        넘침: '-',
        결과: before === 1 && after === 2 ? 'OK' : '펼쳐도 열 개수가 바뀌지 않음',
    }
}

app.whenReady().then(async () => {
    try {
        const args = parseArgs(process.argv.slice(2))
        const win = new BrowserWindow({ width: 460, height: 820, show: false })
        await win.loadFile(DIST)
        if (args.device === null) {
            const [out = '.shots/screenshot.png', seedPath] = args.positional
            await shootDesktop(win, out, readSeed(seedPath))
            app.quit()
            return
        }
        const ids = args.device === 'all' ? Object.keys(DEVICES) : [args.device]
        const unknown = ids.filter(id => !(id in DEVICES))
        if (unknown.length > 0) throw new Error(`모르는 기기: ${unknown.join(', ')} (가능: ${Object.keys(DEVICES).join(', ')})`)
        const seed = readSeed(args.seed)
        const outDir = path.resolve(args.out ?? '.shots/devices')
        const rows = []
        for (const id of ids) rows.push(await checkDevice(win, id, seed, outDir))
        if (args.device === 'all') rows.push(await checkUnfold(win, seed))
        console.table(rows)
        console.log(`screenshots: ${outDir}`)
        app.exit(rows.every(r => r.결과 === 'OK') ? 0 : 1)
    } catch (e) {
        console.error(e)
        app.exit(1)
    }
})
```

- [ ] **Step 3: 극단 입력 seed** — `scripts/seeds/stress.json`

```json
{
    "plans": [
        { "id": "s1", "name": "아주긴플랜이름아주긴플랜이름아주긴", "goal": 999999999999, "currentDate": null, "endDate": "2045-12-31", "asset": 123456789012, "payday": 31, "stepUp": 9999999 },
        { "id": "s2", "name": "두 번째 플랜", "goal": 50000000, "currentDate": null, "endDate": "2029-12-31", "asset": 0, "payday": 21, "stepUp": 100000 },
        { "id": "s3", "name": "세 번째 플랜", "goal": 30000000, "currentDate": null, "endDate": "2028-12-31", "asset": 1000000, "payday": 10, "stepUp": 50000 }
    ],
    "activeId": "s1"
}
```

- [ ] **Step 4: 지금 화면으로 실행 — 실패 확인(RED)**

Run:
```bash
npx vite build
env -u ELECTRON_RUN_AS_NODE npm run shot -- --device all 2>&1 | tail -20; echo "exit=${PIPESTATUS[0]}"
```
Expected: 표가 출력되고 exit=1.
- 11개 기기 모두 `헤더 위 여백 16px(기대 44 이상)` 포함 (안전 영역 미적용)
- `fold8-open`, `fold8-open-portrait`, `fold8u-open`, `phone-landscape` 는 `열 1개(기대 2)`
- `flip8-cover`, `phone-landscape` 는 `헤더 고정 true(기대 false)`
- `unfold` 는 `펼쳐도 열 개수가 바뀌지 않음`

Run:
```bash
env -u ELECTRON_RUN_AS_NODE npm run shot -- --device small-320 --seed scripts/seeds/stress.json --out .shots/stress 2>&1 | tail -6
```
Expected: `small-320` 행 결과에 `헤더 위 여백` 문제가 있고, 넘침 여부가 출력된다(넘침 true 이면 Task 4 의 표 스크롤로 고친다).
`.shots/devices/s26.png`, `fold8-open.png` 를 열어 지금 모습(1열, 넓은 화면에서 양옆 여백)을 확인한다.

- [ ] **Step 5: PC 모드가 그대로인지**

Run: `env -u ELECTRON_RUN_AS_NODE npm run shot -- .shots/task3-pc.png`
Expected: `saved …task3-pc.png` (여러 장), 지금까지와 같은 PC 화면.

- [ ] **Step 6: 커밋**

```bash
git add scripts/capture-kit.cjs scripts/screenshot.cjs scripts/seeds/stress.json
git commit -m "test: device-matrix screen check for phones and foldables"
```

---

### Task 4: 반응형 화면 · 안전 영역 · 터치 · 차트 탭

**Files:**
- Modify: `src/lib/chart.ts`, `src/lib/chart.test.ts`, `src/components/YearlyChart.tsx`, `src/components/ResultCards.tsx`, `src/App.tsx`, `src/index.css`

**Interfaces:**
- Consumes: Task 2 의 `logoUrl` 헤더, Task 3 의 검사 도구
- Produces:
  - `chartLabels(count: number, slot: number, picked: number | null = null): ChartLabels` — picked 연도의 금액 라벨은 항상 보임
  - 클래스 `.col`, `.col-input`, `.col-result`, `.table-scroll`, `.chart-col.is-picked`

- [ ] **Step 1: 실패하는 테스트** — `src/lib/chart.test.ts` 의 `describe('chartLabels', …)` 블록 안 마지막에 추가

```ts
    it('always shows the amount of the year the user tapped', () => {
        const labels = chartLabels(20, 18.4, 7)
        expect(labels.value[7]).toBe(true)
        expect(labels.value.filter(Boolean)).toHaveLength(3)
    })

    it('ignores a tapped year that no longer exists', () => {
        expect(chartLabels(4, 92, 9).value).toEqual([true, true, true, true])
    })
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/lib/chart.test.ts`
Expected: FAIL — `always shows the amount of the year the user tapped` (expected false to be true).

- [ ] **Step 3: 구현** — `src/lib/chart.ts`

`export function chartLabels(count: number, slot: number): ChartLabels {` 를
```ts
/** picked: 사용자가 탭(클릭)한 연도 — 라벨을 솎아내는 중에도 그 해 금액은 보여 준다. */
export function chartLabels(count: number, slot: number, picked: number | null = null): ChartLabels {
```
로, `value:` 줄을
```ts
        value: Array.from({ length: count }, (_, i) => slot >= VALUE_WIDTH || i === 0 || i === count - 1 || i === picked),
```
로 바꾼다.

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: 5 files, 60 tests passed.

- [ ] **Step 5: 차트 탭** — `src/components/YearlyChart.tsx`

맨 위에 `import { useState } from 'react'` 를 추가한다.
`/** 연도별 증액 월 저축액(막대)과 균등 월 저축액(점선) 비교. 막대는 0원에서 시작한다. */` 를
```tsx
/** 연도별 증액 월 저축액(막대)과 균등 월 저축액(점선) 비교. 막대는 0원에서 시작한다. 연도 칸을 탭(클릭)하면 그 해 금액을 고정해서 보여 준다. */
```
로 바꾸고, 함수 첫 줄에 추가:
```tsx
    const [picked, setPicked] = useState<number | null>(null)
```
`const labels = chartLabels(rows.length, slot)` → `const labels = chartLabels(rows.length, slot, picked)`.
`<g key={r.year} className="chart-col">` 를
```tsx
                    <g
                        key={r.year}
                        className={i === picked ? 'chart-col is-picked' : 'chart-col'}
                        onClick={() => setPicked(p => (p === i ? null : i))}
                    >
```
로 바꾼다.

- [ ] **Step 6: 표 가로 스크롤** — `src/components/ResultCards.tsx`

`StepUpTable` 의 `<table className="year-table">` 바로 앞에 `<div className="table-scroll">` 를, `</table>` 바로 뒤에 `</div>` 를 넣는다.

- [ ] **Step 7: 2열 구조** — `src/App.tsx` 의 `<main …>` 부분을 다음으로 교체

```tsx
            {/* key: 탭을 바꾸면 입력 커서·삭제 확인 같은 화면 상태를 초기화한다. */}
            {/* 폭 600px 이상이면 왼쪽 입력·요약, 오른쪽 결과·차트 2열. 좁으면 .col 상자가 사라져 한 줄로 쌓인다. */}
            <main className="app-main" key={active.id}>
                <div className="col col-input">
                    <PlanForm plan={active} today={today} onChange={patch => update(active.id, patch)} />
                    <SummaryBar plan={active} result={result} />
                    <DeletePlan disabled={plans.length <= 1} onDelete={() => remove(active.id)} />
                </div>
                <div className="col col-result">
                    <ResultCards result={result} stepUp={active.stepUp} />
                    {result.status === 'ok' && result.stepUp.ok && <YearlyChart rows={result.stepUp.rows} flatMonthly={result.flatMonthly} />}
                </div>
            </main>
```
(기존 `{/* key: … */}` 주석 한 줄은 위 블록에 포함되어 있으므로 중복되지 않게 한다.)

- [ ] **Step 8: 스타일** — `src/index.css`

(a) `.app` 규칙 전체를 다음으로 교체:
```css
.app {
    max-width: 560px;
    margin: 0 auto;
    padding-right: calc(16px + var(--safe-area-inset-right, env(safe-area-inset-right, 0px)));
    padding-bottom: calc(28px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
    padding-left: calc(16px + var(--safe-area-inset-left, env(safe-area-inset-left, 0px)));
}
```

(b) `.app-header` 의 `padding: 16px 0 12px;` 를
```css
    padding: calc(16px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 0 12px;
```
로 바꾼다.

(c) `.form-grid` 의 `grid-template-columns: 1fr 1fr;` 를 다음으로 바꾼다(칸이 140px 이상이면 2칸, 최대 2칸):
```css
    grid-template-columns: repeat(auto-fit, minmax(max(140px, calc((100% - 12px) / 2)), 1fr));
```

(d) `.year-table` 의 `margin-top: 14px;` 줄을 지운다(아래 `.table-scroll` 이 맡음).

(e) `.result-amount` 규칙 끝에 `overflow-wrap: anywhere;` 를 더한다.

(f) 아래 다섯 규칙을 **지운다**(맨 끝의 `@media (hover: hover)` 로 옮김): `.tab:hover {…}`, `.tab-add:hover {…}`, `.link-btn:hover {…}`, `.btn-ghost:hover:not(:disabled) {…}`, `.chart-col:hover .chart-bar {…}`.

(g) 파일 끝에 추가:
```css
/* ── 휴대폰·폴드 대응 ── */
body {
    -webkit-tap-highlight-color: transparent;
}

.tab:active,
.tab-add:active,
.btn:active:not(:disabled) {
    transform: scale(0.97);
}

/* 요약 카드가 좁으면(폭 360dp 폰 등) 차액을 한 줄 전체로 — 큰 금액이 '…' 로 잘리지 않게 */
.summary {
    container-type: inline-size;
}

@container (max-width: 340px) {
    .stats {
        grid-template-columns: 1fr 1fr;
    }

    .stat:first-child {
        grid-column: 1 / -1;
    }
}

/* 결과 표가 카드보다 넓어지면 표만 가로로 스크롤 */
.table-scroll {
    margin-top: 14px;
    overflow-x: auto;
}

/* 1열(기본): 열 상자는 없는 것처럼 카드만 쌓고, 플랜 삭제는 맨 아래로 */
.col {
    display: contents;
}

.danger-zone {
    order: 1;
}

@media (max-width: 399px) {
    .app {
        padding-right: calc(12px + var(--safe-area-inset-right, env(safe-area-inset-right, 0px)));
        padding-left: calc(12px + var(--safe-area-inset-left, env(safe-area-inset-left, 0px)));
    }

    .card {
        padding: 16px;
    }
}

/* 2열: 폴드 펼친 화면·휴대폰 가로·태블릿 */
@media (min-width: 600px) {
    .app {
        max-width: 1080px;
    }

    .app-main {
        grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
        align-items: start;
    }

    .col {
        display: grid;
        gap: 12px;
        min-width: 0;
    }

    .danger-zone {
        order: 0;
    }
}

/* 높이가 낮으면(휴대폰 가로·플립 커버) 헤더가 화면을 가리지 않게 고정을 푼다 */
@media (max-height: 500px) {
    .app-header {
        position: static;
    }
}

/* 손가락으로 누르기 쉽게 */
@media (pointer: coarse) {
    .tab {
        height: 40px;
    }

    .tab-add {
        width: 40px;
        height: 40px;
    }

    .btn {
        height: 40px;
    }

    .link-btn {
        margin: -6px -4px;
        padding: 6px 4px;
    }
}

/* 마우스가 있는 기기에서만 올림 효과 (터치에서 누른 뒤 색이 남는 문제를 막음) */
@media (hover: hover) {
    .tab:hover {
        border-color: #d8d0c2;
        color: var(--ink);
    }

    .tab-add:hover {
        border-style: solid;
        border-color: var(--accent);
        background: var(--accent-tint);
        color: var(--accent);
    }

    .link-btn:hover {
        text-decoration: underline;
    }

    .btn-ghost:hover:not(:disabled) {
        background: var(--danger-soft);
        color: var(--danger);
    }

    .chart-col:hover .chart-bar {
        filter: brightness(0.9);
    }
}

/* 차트: 탭한 연도는 진하게 */
.chart-col {
    cursor: pointer;
}

.chart-col.is-picked .chart-bar {
    filter: brightness(0.85);
}
```

- [ ] **Step 9: 단위 테스트 · 타입 · 빌드**

Run: `npm test && npx tsc -b && npx vite build`
Expected: 60 passed, 타입 오류 0, 빌드 성공.

- [ ] **Step 10: 기기 검사 — 통과 확인(GREEN)**

Run:
```bash
env -u ELECTRON_RUN_AS_NODE npm run shot -- --device all 2>&1 | tail -20; echo "exit=${PIPESTATUS[0]}"
env -u ELECTRON_RUN_AS_NODE npm run shot -- --device small-320 --seed scripts/seeds/stress.json --out .shots/stress 2>&1 | tail -6; echo "exit=${PIPESTATUS[0]}"
env -u ELECTRON_RUN_AS_NODE npm run shot -- --device flip8-cover --seed scripts/seeds/stress.json --out .shots/stress 2>&1 | tail -6; echo "exit=${PIPESTATUS[0]}"
```
Expected: 세 번 모두 모든 행 `OK`, exit=0. (unfold 행 `1→2`.)

스크린샷을 열어 눈으로 확인한다: `.shots/devices/` 의 `s26`, `flip8-cover`, `fold8-cover`, `fold8-open`, `fold8-open-portrait`, `fold8u-open`, `phone-landscape`, `small-320` (`-end` 포함), `.shots/stress/small-320*.png`.
확인할 것: 2열에서 왼쪽 입력·요약·플랜 삭제 / 오른쪽 결과·차트, 360dp 이하에서 차액이 한 줄 전체로 잘리지 않음, 글자·버튼 겹침 없음, 헤더 위 28px 여백.

- [ ] **Step 11: PC 화면 그대로인지**

Run: `env -u ELECTRON_RUN_AS_NODE npm run shot -- .shots/task4-pc.png`
Expected: Task 3 Step 5 의 `.shots/task3-pc*.png` 와 같은 배치(1열, 460px, 마우스 올림 효과 유지).

- [ ] **Step 12: 커밋**

```bash
git add src
git commit -m "feat: responsive two-column layout, safe areas, touch targets and chart tap"
```

---

### Task 5: 서명 배포 빌드 · Play 등록 이미지 · 가이드

**Files:**
- Modify: `android/app/build.gradle`, `scripts/android.mjs`, `package.json`, `README.md`
- Create: `scripts/store-assets.cjs`, `scripts/store/feature-graphic.html`, `scripts/seeds/store.json`, `docs/play-store.md`, `docs/privacy-policy.md`
- Generate: `store/feature-graphic.png`, `store/screenshots/phone-1~4.png`, `store/screenshots/tablet-1~2.png`

**Interfaces:**
- Consumes: Task 1 `scripts/android.mjs`, Task 2 `src/assets/logo.svg`·`store/icon-512.png`, Task 3 `capture-kit.cjs`
- Produces: `npm run android:release`, `npm run store`, `docs/play-store.md`, `docs/privacy-policy.md`

- [ ] **Step 1: 서명 설정** — `android/app/build.gradle`

Task 1 에서 넣은 버전 코드 블록 바로 아래에 추가:
```groovy

// 업로드 키: android/keystore.properties (git 제외) 가 있으면 release 빌드에 서명한다. 만드는 법은 docs/play-store.md
def keystorePropertiesFile = rootProject.file('keystore.properties')
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }
}
```
`android {` 블록 안, `buildTypes {` 바로 위에 추가:
```groovy
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
```
`buildTypes { release {` 안의 `minifyEnabled false` 위에 추가:
```groovy
            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : null
```

- [ ] **Step 2: release 모드** — `scripts/android.mjs` 전체를 다음으로 교체 (Task 1 에서 junction 대체를 적용했다면 `asciiRoot` 부분을 그대로 유지한다)

```js
// 안드로이드 빌드: 웹 결과물(dist)을 android/ 로 옮긴 뒤 gradle 로 만들고 release/ 로 복사한다.
//   node scripts/android.mjs apk       테스트용 release/증액저축-debug.apk
//   node scripts/android.mjs release   Play 업로드용 release/증액저축.aab + 직접 전달용 release/증액저축.apk (업로드 키 필요)
// package.json 의 android:apk / android:release 가 웹 빌드 후 실행한다.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const androidDir = join(root, 'android')
const outDir = join(root, 'release')
const outputs = join(androidDir, 'app', 'build', 'outputs')
const mode = process.argv[2]

function fail(message) {
    console.error(`\n${message}`)
    process.exit(1)
}

/** 셸을 거쳐 실행한다 (Windows 의 npx·gradlew.bat). */
function run(command, cwd) {
    execSync(command, { cwd, stdio: 'inherit' })
}

if (mode !== 'apk' && mode !== 'release') fail('사용: node scripts/android.mjs apk | release')
if (!process.env.JAVA_HOME) fail('JAVA_HOME 이 없습니다. JDK 21 을 설치하고 새 터미널에서 다시 실행하세요.')
if (mode === 'release' && !existsSync(join(androidDir, 'keystore.properties'))) {
    fail('android/keystore.properties 가 없습니다. docs/play-store.md 의 "3. 업로드 키 만들기"를 먼저 진행하세요.')
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
run('npx cap sync android', root)
mkdirSync(outDir, { recursive: true })

if (mode === 'apk') {
    run(`${gradlew} assembleDebug`, androidDir)
    copyFileSync(join(outputs, 'apk', 'debug', 'app-debug.apk'), join(outDir, '증액저축-debug.apk'))
    console.log(`\n완료: ${join(outDir, '증액저축-debug.apk')}`)
} else {
    run(`${gradlew} bundleRelease assembleRelease`, androidDir)
    copyFileSync(join(outputs, 'bundle', 'release', 'app-release.aab'), join(outDir, '증액저축.aab'))
    copyFileSync(join(outputs, 'apk', 'release', 'app-release.apk'), join(outDir, '증액저축.apk'))
    console.log(`\n완료:\n  Play 업로드용  ${join(outDir, '증액저축.aab')}\n  직접 전달용    ${join(outDir, '증액저축.apk')}`)
}
```

`package.json` `"scripts"` 에 추가(`"android:apk"` 줄 아래):
```json
        "android:release": "tsc -b && vite build && node scripts/android.mjs release",
        "store": "vite build && electron scripts/store-assets.cjs",
```

- [ ] **Step 3: 키 없이 release 를 부르면 안내하고 멈추는지**

Run: `export JAVA_HOME="C:/Users/PIX-BIBLE/AppData/Local/Programs/Temurin/jdk-21.0.12.1+1" ANDROID_HOME="C:/Users/PIX-BIBLE/AppData/Local/Android/Sdk"; npm run android:release 2>&1 | tail -3; echo "exit=${PIPESTATUS[0]}"`
Expected: `android/keystore.properties 가 없습니다. docs/play-store.md 의 "3. 업로드 키 만들기"를 먼저 진행하세요.`, exit 가 0 이 아님.

- [ ] **Step 4: 임시 키로 서명 빌드 검증 후 삭제**

```bash
SP="C:/Users/PIX-BI~1/AppData/Local/Temp/claude/e--project-13----GUI-02--Source-or-conference-guest/3f0ecef9-cae9-4f5b-804c-35343eca7cc7/scratchpad"
"$JAVA_HOME/bin/keytool" -genkeypair -keystore "$SP/test-upload.jks" -storetype PKCS12 -alias upload -keyalg RSA -keysize 2048 -validity 10000 -storepass test-pass-123 -keypass test-pass-123 -dname "CN=Test Only"
printf 'storeFile=%s\nstorePassword=test-pass-123\nkeyAlias=upload\nkeyPassword=test-pass-123\n' "$(cygpath -m "$SP/test-upload.jks")" > android/keystore.properties
npm run android:release > .shots/android-release.log 2>&1; echo "exit=$?"; tail -4 .shots/android-release.log
"$ANDROID_HOME/build-tools/36.0.0/apksigner.bat" verify --print-certs release/증액저축.apk | head -2
"$JAVA_HOME/bin/jarsigner" -verify release/증액저축.aab | grep -c "jar verified"
rm -f android/keystore.properties "$SP/test-upload.jks" release/증액저축.aab release/증액저축.apk
git status --short | grep -E "keystore|\.jks" || echo "no key files tracked"
```
Expected: exit=0, `완료:` 두 줄, `Signer #1 certificate DN: CN=Test Only`, jarsigner 줄은 `1`, 마지막 `no key files tracked`.
(임시 키로 서명된 결과물은 Play 에 쓸 수 없으므로 함께 지운다.)

- [ ] **Step 5: Play 이미지용 예시 데이터** — `scripts/seeds/store.json`

```json
{
    "plans": [
        { "id": "home", "name": "내 집 마련", "goal": 100000000, "currentDate": null, "endDate": "2029-12-31", "asset": 30000000, "payday": 25, "stepUp": 100000 },
        { "id": "emergency", "name": "비상금", "goal": 10000000, "currentDate": null, "endDate": "2027-12-31", "asset": 2500000, "payday": 25, "stepUp": 50000 },
        { "id": "travel", "name": "가족 여행", "goal": 5000000, "currentDate": null, "endDate": "2027-08-31", "asset": 1200000, "payday": 25, "stepUp": 0 }
    ],
    "activeId": "home"
}
```

- [ ] **Step 6: 대표 이미지 템플릿** — `scripts/store/feature-graphic.html`

```html
<!doctype html>
<html lang="ko">
    <head>
        <meta charset="UTF-8" />
        <title>증액저축 계산기 Play 대표 이미지</title>
        <link rel="stylesheet" href="../../node_modules/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css" />
        <style>
            /* Play 대표 이미지 1024×500 — scripts/store-assets.cjs 가 이 파일을 그대로 찍는다 */
            html,
            body {
                margin: 0;
                width: 1024px;
                height: 500px;
                overflow: hidden;
            }

            body {
                box-sizing: border-box;
                display: flex;
                align-items: center;
                gap: 60px;
                padding: 0 92px;
                background: radial-gradient(circle at 85% 15%, #fdf9f1 0%, #f6f2ea 45%, #ebe3d5 100%);
                color: #1c2420;
                font-family: 'Pretendard Variable', Pretendard, sans-serif;
            }

            img {
                flex: none;
                width: 228px;
                height: 228px;
                border-radius: 52px;
                box-shadow: 0 24px 56px rgb(17 85 58 / 0.35);
            }

            h1 {
                margin: 0;
                font-size: 64px;
                font-weight: 800;
                letter-spacing: -0.03em;
                color: #135c3f;
            }

            p {
                margin: 20px 0 0;
                font-size: 30px;
                font-weight: 600;
                line-height: 1.45;
                color: #57625c;
            }
        </style>
    </head>
    <body>
        <img src="../../src/assets/logo.svg" alt="" />
        <div>
            <h1>증액저축 계산기</h1>
            <p>목표까지 매달 얼마씩,<br />해마다 얼마나 늘려 갈지</p>
        </div>
    </body>
</html>
```

- [ ] **Step 7: Play 이미지 생성 스크립트** — `scripts/store-assets.cjs`

```js
// Play 스토어 등록 이미지: 휴대폰 스크린샷 4장(1080×1920), 태블릿 2장(1920×1080), 대표 이미지(1024×500).
// 사용: npm run store   (vite build 후 실행된다). 값은 scripts/seeds/store.json 의 가상 예시만 쓴다.
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow } = require('electron')
const { DIST, emulate, loadWithSeed, screenshot, sleep } = require('./capture-kit.cjs')

const OUT = path.join(__dirname, '..', 'store')
const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, 'seeds', 'store.json'), 'utf-8'))
const seedWith = activeId => JSON.stringify({ ...SEED, activeId })

const PHONE = { width: 360, height: 640, scale: 3 } // → 1080×1920
const TABLET = { width: 960, height: 540, scale: 2 } // → 1920×1080

/** 고정 헤더에 가리지 않게, 요소 위쪽이 헤더 바로 아래에 오도록 스크롤한다. */
async function scrollBelowHeader(win, selector) {
    await win.webContents.executeJavaScript(`(() => {
        const header = document.querySelector('.app-header').getBoundingClientRect().height
        const el = document.querySelector(${JSON.stringify(selector)})
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header - 8)
    })()`)
    await sleep(200)
}

app.whenReady().then(async () => {
    try {
        const win = new BrowserWindow({ width: 460, height: 820, show: false })
        await win.loadFile(DIST)

        // 휴대폰: ① 입력 ② 요약·균등 ③ 증액 표·차트 ④ 플랜 여러 개(탭)
        await emulate(win, PHONE)
        const phone = [
            ['phone-1', 'home', null],
            ['phone-2', 'home', '.summary'],
            ['phone-3', 'home', '.result-step'],
            ['phone-4', 'emergency', null],
        ]
        for (const [name, active, target] of phone) {
            await loadWithSeed(win, seedWith(active))
            if (target !== null) await scrollBelowHeader(win, target)
            await screenshot(win, path.join(OUT, 'screenshots', `${name}.png`))
        }

        // 태블릿·폴드 펼침(2열)
        await emulate(win, TABLET)
        for (const [name, active] of [['tablet-1', 'home'], ['tablet-2', 'emergency']]) {
            await loadWithSeed(win, seedWith(active))
            await screenshot(win, path.join(OUT, 'screenshots', `${name}.png`))
        }

        // 대표 이미지: 정적 템플릿을 1024×500, 배율 1 로
        await emulate(win, { width: 1024, height: 500, scale: 1, mobile: false })
        await win.loadFile(path.join(__dirname, 'store', 'feature-graphic.html'))
        await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
        await sleep(300)
        await screenshot(win, path.join(OUT, 'feature-graphic.png'))

        console.log(`saved store images in ${OUT}`)
        app.quit()
    } catch (e) {
        console.error(e)
        app.exit(1)
    }
})
```

- [ ] **Step 8: 이미지 만들기 · 규격 확인**

Run:
```bash
env -u ELECTRON_RUN_AS_NODE npm run store 2>&1 | tail -2
node -e "for (const f of process.argv.slice(1)) { const b = require('fs').readFileSync(f); console.log(f, b.readUInt32BE(16) + 'x' + b.readUInt32BE(20)) }" store/icon-512.png store/feature-graphic.png store/screenshots/*.png
```
Expected: `saved store images …`, 그리고
```
store/icon-512.png 512x512
store/feature-graphic.png 1024x500
store/screenshots/phone-1.png 1080x1920   (phone-2~4 동일)
store/screenshots/tablet-1.png 1920x1080  (tablet-2 동일)
```
모든 이미지를 열어 본다: 예시 값(내 집 마련 1억·3,000만 원)만 보이고, 글자 잘림·겹침이 없고, phone-4 에 탭 3개, tablet 은 2열.

- [ ] **Step 9: 개인정보처리방침** — `docs/privacy-policy.md`

```markdown
# 증액저축 계산기 개인정보처리방침

시행일: 2026년 10월 12일 (게시하는 날짜로 바꾸세요)

증액저축 계산기(이하 "앱")는 이용자의 개인정보를 수집하지 않습니다.

## 1. 수집하는 정보

앱은 이름, 연락처, 위치, 기기 식별자 등 어떠한 개인정보도 수집하지 않으며 회원가입 기능이 없습니다.

## 2. 앱에 입력한 값의 저장

목표금액, 현재자산, 날짜 등 앱에 입력한 값은 계산을 위해 이용자의 기기 안에만 저장되며, 개발자를 포함한 누구에게도 전송되지 않습니다. 앱을 삭제하면 함께 지워집니다.
이용자가 안드로이드 기본 백업을 켜 둔 경우 이 값이 이용자 본인의 Google 계정 백업에 포함될 수 있으며, 이는 Google 의 정책을 따릅니다.

## 3. 제3자 제공·광고·분석

앱은 정보를 제3자에게 제공하지 않으며 광고나 이용 분석 도구를 사용하지 않습니다.

## 4. 아동의 개인정보

앱은 아동을 대상으로 하지 않으며 아동의 개인정보를 수집하지 않습니다.

## 5. 방침의 변경

이 방침이 바뀌면 이 페이지에 바뀐 내용과 시행일을 게시합니다.

## 6. 문의

개인정보 관련 문의: [연락처 이메일]
```

- [ ] **Step 10: Play 등록 가이드** — `docs/play-store.md`

````markdown
# Google Play 등록 가이드 — 증액저축 계산기

처음부터 끝까지 순서대로 따라 하면 됩니다. 직접 하셔야 하는 일에는 **[직접]** 을 붙였습니다.

## 0. 한눈에 보기

1. [직접] 개발자 계정 만들기 (25달러, 한 번만)
2. [직접] 업로드 키 만들기 → `npm run android:release` 로 앱 파일(aab) 만들기
3. [직접] 앱 전용 연락 이메일 만들기, 개인정보처리방침 페이지 게시
4. Play Console 에서 앱 만들기 → 앱 콘텐츠 → 스토어 등록정보 (이 문서의 답변·문구·이미지를 그대로 사용)
5. [직접] 비공개 테스트: 테스터 12명 이상, 14일 연속
6. 프로덕션(정식) 출시 신청 → 심사 → 공개
7. 출시 후 관리

## 1. 준비물

| 항목 | 파일 |
|---|---|
| 앱 파일 | `release/증액저축.aab` — `npm run android:release` 로 만듦 |
| 앱 아이콘 512×512 | `store/icon-512.png` |
| 그래픽 이미지 1024×500 | `store/feature-graphic.png` |
| 휴대전화 스크린샷 | `store/screenshots/phone-1.png` ~ `phone-4.png` |
| 태블릿 스크린샷 (선택) | `store/screenshots/tablet-1.png`, `tablet-2.png` |
| 개인정보처리방침 문안 | `docs/privacy-policy.md` |

이미지는 `npm run store` 로 언제든 다시 만들 수 있습니다.

## 2. 개발자 계정 만들기 [직접]

1. https://play.google.com/console 에 Google 계정으로 로그인 → 개발자 계정 만들기.
2. 계정 유형은 **개인**. 등록비 25달러를 한 번 결제하고 신분증으로 본인 확인을 합니다.
3. 계정 세부정보에서 **연락처 이메일·전화번호 인증**까지 끝내 둡니다(9장 "계정 유지" 참고).

2023년 11월 이후 만든 개인 계정은 정식 출시 전에 **테스터 12명 이상이 14일 연속 참여한 비공개 테스트**가 필요합니다(7장).

## 3. 업로드 키 만들기 [직접]

Play 에 올리는 파일은 업로드 키로 서명합니다. 한 번 만들어 계속 쓰며, 잃어버리면 재설정 절차(며칠 소요)를 거쳐야 하니 꼭 백업하세요.

1. 키를 둘 폴더를 정합니다. 프로젝트 폴더 **밖**이 안전합니다.
2. 새 PowerShell 창에서:
   ```powershell
   mkdir C:\Users\PIX-BIBLE\Documents\keys
   & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -keystore C:\Users\PIX-BIBLE\Documents\keys\stepupsavings-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   비밀번호를 정해 두 번 입력합니다(따로 적어 보관). 이름 등을 묻는 질문은 이름만 넣고 나머지는 Enter 로 넘겨도 됩니다. 마지막 확인에 `y`.
3. 프로젝트의 `android` 폴더에 `keystore.properties` 파일을 새로 만들고 아래처럼 적습니다. **경로의 `\` 는 `/` 로** 적어야 합니다.
   ```properties
   storeFile=C:/Users/PIX-BIBLE/Documents/keys/stepupsavings-upload.jks
   storePassword=정한 비밀번호
   keyAlias=upload
   keyPassword=정한 비밀번호
   ```
   이 파일과 `.jks` 는 git 에 올라가지 않게 막혀 있습니다.
4. `.jks` 파일과 비밀번호를 USB·클라우드 등 다른 곳에도 백업합니다.

## 4. 앱 파일 만들기

```powershell
npm run android:release
```

- `release\증액저축.aab` — Play 업로드용
- `release\증액저축.apk` — 지인 휴대폰에 직접 설치할 때(파일을 보내고 "출처를 알 수 없는 앱 설치" 허용)

## 5. 연락 이메일과 개인정보처리방침 [직접]

- Play 스토어 페이지에는 **연락 이메일이 반드시 공개**됩니다. 개인·회사 메일 대신 앱 전용 Gmail 을 새로 만들어 쓰기를 권합니다.
- `docs/privacy-policy.md` 내용을 복사해 `[연락처 이메일]` 을 그 이메일로, 시행일을 게시하는 날짜로 바꾼 뒤 누구나 볼 수 있는 페이지로 게시합니다. 예: 노션 페이지 → 공유 → 웹에 게시, 또는 구글 사이트.
- 게시한 페이지 주소를 6-2 의 "개인정보처리방침"에 넣습니다.

## 6. Play Console 에서 등록

### 6-1. 앱 만들기

- 앱 이름: `증액저축 계산기`
- 기본 언어: 한국어 – ko-KR
- 앱 또는 게임: 앱 / 무료 또는 유료: 무료
- 선언(개발자 프로그램 정책, 미국 수출 법규) 체크

### 6-2. 앱 콘텐츠 (정책 및 프로그램 → 앱 콘텐츠)

| 항목 | 답변 |
|---|---|
| 개인정보처리방침 | 5장에서 게시한 페이지 주소 |
| 앱 액세스 권한 | 모든 기능을 특별한 액세스 권한 없이 사용할 수 있음 |
| 광고 | 아니요, 앱에 광고가 없습니다 |
| 콘텐츠 등급 | 설문 시작 → 이메일 입력 → 카테고리 "기타 모든 앱 유형" → 모든 질문 "아니요" → 전체이용가 |
| 타겟층 및 콘텐츠 | 만 18세 이상만 선택 |
| 데이터 보안 | "앱에서 필수 사용자 데이터 유형을 수집하거나 공유하나요?" → **아니요** (입력값은 기기 안에만 저장, 외부 전송 없음) |
| 정부 앱 | 아니요 |
| 금융 기능 | 대출·결제·투자 같은 금융 서비스를 제공하지 않으므로 "금융 기능을 제공하지 않음" |
| 건강 | 해당 없음 |

### 6-3. 스토어 등록정보 (기본 스토어 등록정보)

- 앱 이름: `증액저축 계산기`
- 간단한 설명(80자 이내):
  ```
  목표금액까지 매달 얼마? 해마다 늘려 가는 증액저축 월 저축액을 바로 계산해요.
  ```
- 자세한 설명:
  ```
  증액저축 계산기는 목표금액까지 남은 돈을 "매달 같은 금액"으로 모을 때와 "해마다 늘려 가며" 모을 때, 매달 얼마씩 저축하면 되는지 바로 계산해 줍니다.

  ■ 이런 분께
  • 연봉이 오를 때마다 저축액도 늘려 가고 싶은 분
  • 몇 년 안에 1억, 5천만 원 같은 목표금액을 모으고 싶은 분
  • 엑셀로 계산하던 저축 계획을 휴대폰으로 보고 싶은 분

  ■ 주요 기능
  • 목표금액·현재자산·완료날짜·월급날·연간 증액액만 넣으면 끝
  • 월급날 기준으로 남은 개월 수 자동 계산 (월급날 전후, 완료월까지 정확하게)
  • 균등 저축: 매달 같은 금액
  • 증액 저축: 첫해 월 저축액부터 해마다 늘어나는 연도별 금액과 연간 합계
  • 연도별 월 저축액 차트
  • 목표를 여러 개 만들어 탭으로 비교 (내 집 마련, 비상금, 여행 등)
  • 폴드·플립 같은 큰 화면과 작은 화면 모두 지원

  ■ 개인정보
  입력한 값은 휴대폰 안에만 저장되며 어디로도 전송되지 않습니다. 회원가입과 광고가 없습니다.
  ```
- 앱 아이콘: `store/icon-512.png` / 그래픽 이미지: `store/feature-graphic.png`
- 휴대전화 스크린샷: `store/screenshots/phone-1.png` ~ `phone-4.png`
- 7인치·10인치 태블릿 스크린샷(선택): `store/screenshots/tablet-1.png`, `tablet-2.png`
- 앱 카테고리: 금융
- 연락처 이메일: 5장의 앱 전용 이메일

## 7. 비공개 테스트 [직접]

1. 테스트 및 출시 → 테스트 → 비공개 테스트 → 트랙 관리.
2. 테스터 탭에서 이메일 목록을 만들고 테스터 Gmail 주소를 **12개 이상** 추가합니다(가족·지인).
3. 버전 탭 → 새 버전 만들기 → `release\증액저축.aab` 업로드 → 출시 노트(예: "첫 테스트 버전") → 검토 → 출시.
4. 테스터에게 "웹에서 참여" 링크를 보내 참여하고 Play 스토어에서 설치해 실제로 써 보게 합니다.
5. 12명 이상이 **14일 연속** 참여 상태여야 합니다. 중간에 12명 아래로 줄면 처음부터 다시 셉니다. 테스터가 실제로 앱을 쓰는지도 확인하니 몇 번씩 열어 보게 하세요.
6. 14일이 지나면 대시보드에 "프로덕션 액세스 신청"이 열립니다.

## 8. 정식 출시

1. 대시보드 → 프로덕션 액세스 신청 → 테스트 방법·받은 의견 등 질문에 답합니다.
2. 승인되면 테스트 및 출시 → 프로덕션 → 국가/지역에서 대한민국 추가 → 새 버전 만들기 → aab 업로드 → 검토 → 출시.
3. 심사는 보통 며칠 걸리며 결과는 이메일과 Console 에 표시됩니다.

## 9. 출시 후 관리

### 업데이트 올리기

1. `package.json` 의 `"version"` 을 올립니다(예: `1.0.0` → `1.0.1`). versionCode 는 자동으로 커집니다 — Play 는 이전보다 큰 versionCode 만 받습니다.
2. `npm run android:release`
3. Play Console → 프로덕션(또는 테스트 트랙) → 새 버전 만들기 → aab 업로드 → 출시 노트 → 검토 → 출시. 필요하면 단계적 출시(예: 20% → 100%)를 쓸 수 있습니다.

### 1년에 한 번은 업데이트 (대상 API 요건)

Google 은 매년 8월 말쯤 "대상 API 수준" 요건을 올립니다(2026년: 새 앱·업데이트는 Android 16, API 36). 요건보다 낮은 상태로 두면 기존 사용자는 계속 쓰지만 최신 휴대폰의 새 사용자에게는 설치가 막힐 수 있습니다. 매년 여름 Capacitor 를 최신 버전으로 올려(대상 API 가 함께 올라감) 새 버전을 올리면 됩니다. Console 경고 메일이 오면 그때 해도 됩니다.

### 확인할 곳

- 통계: 설치·사용자 수
- 평점 및 리뷰: 리뷰에 답글 달기
- Android vitals: 비정상 종료·응답 없음(ANR)
- 받은편지함·정책 상태: 정책 변경으로 할 일이 생기면 여기와 이메일로 알려 줍니다

### 개발자 계정 유지

Google 은 활동이 없는 계정을 닫습니다. 설치가 1,000회 미만인 개인 계정이라면:

- 계정 세부정보에서 연락처 이메일·전화번호 인증을 마쳐 두고
- 180일 안에 한 번은 Play Console 에 로그인하세요.

닫히기 60·30·7일 전에 경고 메일이 오며, 등록비는 돌려받지 못합니다.

### 업로드 키를 잃어버렸을 때

앱 서명 키는 Google 이 보관합니다(Play 앱 서명, 기본값). 업로드 키만 잃어버렸다면 설정 → 앱 서명에서 업로드 키 재설정을 요청합니다. 새 키를 만들어 인증서를 제출하고 승인까지 며칠 걸립니다.

### 앱 내리기

테스트 및 출시 → 설정 → 고급 설정 → 앱 게시 상태에서 게시를 취소하면 새로 설치할 수 없게 됩니다. 이미 설치한 사람은 계속 쓸 수 있습니다.

## 참고

- 대상 API 요건: https://developer.android.com/google/play/requirements/target-sdk
- 스토어 연락처 정보: https://support.google.com/googleplay/android-developer/answer/13634081
- Play Console 고객센터: https://support.google.com/googleplay/android-developer
````

- [ ] **Step 11: README** — `README.md` 의 `## 계산 규칙` 바로 위에 추가

````markdown
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

````

- [ ] **Step 12: 전체 확인 · 커밋**

Run: `npm test && npx tsc -b`
Expected: 60 passed, 타입 오류 0.

Run: `export JAVA_HOME="C:/Users/PIX-BIBLE/AppData/Local/Programs/Temurin/jdk-21.0.12.1+1" ANDROID_HOME="C:/Users/PIX-BIBLE/AppData/Local/Android/Sdk"; npm run android:apk > .shots/android-apk.log 2>&1; echo "exit=$?"`
Expected: exit=0 (서명 설정을 넣은 뒤에도 debug 빌드가 된다).

Run: `git status --short`
Expected: 키 파일 없음. 변경 파일은 아래 목록뿐.

```bash
git add android/app/build.gradle scripts/android.mjs scripts/store-assets.cjs scripts/store/feature-graphic.html scripts/seeds/store.json store docs/play-store.md docs/privacy-policy.md README.md package.json
git commit -m "feat: signed release build, Play store images and publishing guide"
```
