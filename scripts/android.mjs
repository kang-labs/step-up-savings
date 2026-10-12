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

// 전체 경로로 부른다 — NoDefaultCurrentDirectoryInExePath 가 켜진 셸은 현재 폴더의 .bat 을 찾지 않는다.
const gradlew = process.platform === 'win32' ? `"${join(androidDir, 'gradlew.bat')}"` : './gradlew'
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
