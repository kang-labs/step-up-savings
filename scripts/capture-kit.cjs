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

/**
 * 지금 보이는 뷰포트를 PNG 로 저장한다. 결과 픽셀 = 뷰포트 × 이 프로세스의 화면 배율이다
 * (정확한 픽셀 크기가 필요하면 app 준비 전에 force-device-scale-factor 스위치를 건다).
 * CDP Page.captureScreenshot 은 숨은 창에서 스크롤 뒤 새 화면을 기다리다 멈추는 일이 있어 쓰지 않는다.
 */
async function screenshot(win, file) {
    const image = await win.webContents.capturePage()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, image.toPNG())
}

module.exports = { STORAGE_KEY, DIST, sleep, loadWithSeed, emulate, screenshot }
