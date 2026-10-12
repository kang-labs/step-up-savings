// 개발용: 빌드된 dist/index.html 을 실제 앱과 같은 크기의 숨은 창에 띄워 PNG 로 저장한다. exe 에는 포함되지 않는다.
// 사용: npm run shot -- .shots/out.png [seed.json]   (seed = localStorage 에 넣을 PlansState JSON)
// 화면보다 길면 스크롤하며 out.png, out-2.png, out-3.png … 로 나눠 저장한다.
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow } = require('electron')

const STORAGE_KEY = 'step-up-savings/v1'
const HEADER_OVERLAP = 120 // 고정 헤더에 가려지는 부분이 다음 장에 다시 나오도록 겹쳐 찍는다.
const [out = '.shots/screenshot.png', seedPath] = process.argv.slice(2)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

app.whenReady().then(async () => {
    const win = new BrowserWindow({ width: 460, height: 820, show: false })
    const run = script => win.webContents.executeJavaScript(script)
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

    // 매번 같은 상태에서 찍도록 저장값을 seed 로 덮거나 지운 뒤 다시 읽힌다.
    const seed = seedPath ? fs.readFileSync(path.resolve(seedPath), 'utf-8') : null
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
    app.quit()
})
