// Play 스토어 등록 이미지. 값은 scripts/seeds/store.json 의 가상 예시만 쓴다.
//   electron scripts/store-assets.cjs phone    휴대폰 스크린샷 4장 (1080×1920)
//   electron scripts/store-assets.cjs tablet   태블릿 스크린샷 2장 (1920×1080) + 대표 이미지 (1024×500)
// npm run store 가 vite build 뒤 두 가지를 차례로 실행한다.
// 캡처 픽셀 = 뷰포트 × 프로세스 화면 배율이라, 정확한 크기를 위해 배율을 고정한 프로세스를 따로 띄운다.
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow } = require('electron')
const sharp = require('sharp')
const { DIST, emulate, loadWithSeed, screenshot, sleep } = require('./capture-kit.cjs')

const MODE = process.argv[2]
const SCALE = { phone: 3, tablet: 2 }[MODE]
if (SCALE === undefined) {
    console.error('사용: electron scripts/store-assets.cjs phone | tablet')
    process.exit(1)
}
app.commandLine.appendSwitch('force-device-scale-factor', String(SCALE))

const OUT = path.join(__dirname, '..', 'store')
const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, 'seeds', 'store.json'), 'utf-8'))
const seedWith = activeId => JSON.stringify({ ...SEED, activeId })

/** 고정 헤더에 가리지 않게, 요소 위쪽이 헤더 바로 아래에 오도록 스크롤한다. */
async function scrollBelowHeader(win, selector) {
    await win.webContents.executeJavaScript(`(() => {
        const header = document.querySelector('.app-header').getBoundingClientRect().height
        const el = document.querySelector(${JSON.stringify(selector)})
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header - 8)
    })()`)
    await sleep(200)
}

async function phone(win) {
    // ① 입력 ② 요약·균등 ③ 증액 표·차트 ④ 플랜 여러 개(탭)
    await emulate(win, { width: 360, height: 640, scale: SCALE })
    const shots = [
        ['phone-1', 'home', null],
        ['phone-2', 'home', '.summary'],
        ['phone-3', 'home', '.result-step'],
        ['phone-4', 'emergency', null],
    ]
    for (const [name, active, target] of shots) {
        await loadWithSeed(win, seedWith(active))
        if (target !== null) await scrollBelowHeader(win, target)
        await screenshot(win, path.join(OUT, 'screenshots', `${name}.png`))
    }
}

async function tablet(win) {
    // 태블릿·폴드 펼침(2열)
    await emulate(win, { width: 960, height: 540, scale: SCALE })
    for (const [name, active] of [['tablet-1', 'home'], ['tablet-2', 'emergency']]) {
        await loadWithSeed(win, seedWith(active))
        await screenshot(win, path.join(OUT, 'screenshots', `${name}.png`))
    }
    // 대표 이미지: 정적 템플릿을 배율 2 로 찍어 1024×500 으로 줄인다(글자가 더 매끈해짐).
    await emulate(win, { width: 1024, height: 500, scale: SCALE, mobile: false })
    await win.loadFile(path.join(__dirname, 'store', 'feature-graphic.html'))
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    await sleep(300)
    const raw = path.join(OUT, 'feature-graphic@2x.png')
    await screenshot(win, raw)
    await sharp(raw).resize(1024, 500).png().toFile(path.join(OUT, 'feature-graphic.png'))
    fs.rmSync(raw)
}

app.whenReady().then(async () => {
    try {
        const win = new BrowserWindow({ width: 460, height: 820, show: false })
        await win.loadFile(DIST)
        await (MODE === 'phone' ? phone(win) : tablet(win))
        console.log(`saved ${MODE} store images in ${OUT}`)
        app.quit()
    } catch (e) {
        console.error(e)
        app.exit(1)
    }
})
