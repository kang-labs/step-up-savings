// 개발용 화면 캡처 (exe 에는 포함되지 않음). 먼저 vite build 로 dist 를 만든다.
//
//   npm run shot -- <out.png> [seed.json]
//       PC 창 크기(460×820)로 찍는다. 화면보다 길면 out-2.png, out-3.png … 로 나눈다.
//   npm run shot -- --device <id|all> [--seed seed.json] [--out .shots/devices]
//       휴대폰·폴드 화면을 터치 기기로 흉내 내 찍고, 기기마다 열 개수·헤더 고정·가로 넘침·안전 영역·'…' 잘림을 검사한다.
//       all 이면 기본·극단 입력·10억대 데이터를 모두 검사하고, 폴드를 켠 채로 펼치기와 PC 마우스 올림도 검사한다.
//       기대와 다른 것이 있으면 종료 코드 1.
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow } = require('electron')
const { DIST, loadWithSeed, emulate, screenshot, sleep } = require('./capture-kit.cjs')

const HEADER_OVERLAP = 120 // PC 모드: 고정 헤더에 가려진 부분이 다음 장에 다시 나오도록 겹쳐 찍는다.
const BASE_INSET = { top: 28, right: 0, bottom: 24, left: 0 } // 기기 모드: 상태바·내비게이션 바 높이 흉내(dp)

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
    // 가로로 눕히면 카메라 구멍이 한쪽 옆에 온다
    'phone-landscape': { name: '휴대폰 가로', width: 780, height: 360, columns: 2, sticky: false, inset: { right: 48 } },
    'small-320': { name: '화면 크게 보기 320dp', width: 320, height: 690, columns: 1, sticky: true },
}

// --device all 이 함께 검사하는 데이터 (스크린샷은 기본 데이터만 찍는다)
const SEEDS = {
    기본: null,
    극단: path.join(__dirname, 'seeds', 'stress.json'),
    '10억대': path.join(__dirname, 'seeds', 'big.json'),
    연수익: path.join(__dirname, 'seeds', 'return.json'),
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
        const app = getComputedStyle(document.querySelector('.app'))
        // '…' 로 잘린 글자: text-overflow 가 ellipsis 이고 내용이 칸보다 넓은 요소
        const clipped = [...document.querySelectorAll('body *')]
            .filter(el => getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
            .map(el => (el.textContent || '').trim().slice(0, 20))
        return {
            columns: main.gridTemplateColumns.split(' ').length,
            sticky: header.position === 'sticky',
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            headerPadTop: parseFloat(header.paddingTop),
            padRight: parseFloat(app.paddingRight),
            coarse: matchMedia('(pointer: coarse)').matches,
            clipped,
        }
    })()`)
}

/** 상태바·내비게이션 바·카메라 구멍 자리를 Capacitor 가 넣어 주는 변수로 흉내 낸다. */
async function setInsets(win, inset) {
    await win.webContents.executeJavaScript(`(() => {
        const s = document.documentElement.style
        for (const [side, px] of Object.entries(${JSON.stringify(inset)})) s.setProperty('--safe-area-inset-' + side, px + 'px')
    })()`)
    await sleep(100)
}

async function checkDevice(win, id, seedName, seed, outDir, shots) {
    const d = DEVICES[id]
    const inset = { ...BASE_INSET, ...d.inset }
    await emulate(win, d)
    await loadWithSeed(win, seed)
    await setInsets(win, inset)
    const got = await inspect(win)
    const problems = []
    if (got.columns !== d.columns) problems.push(`열 ${got.columns}개(기대 ${d.columns})`)
    if (got.sticky !== d.sticky) problems.push(`헤더 고정 ${got.sticky}(기대 ${d.sticky})`)
    if (got.overflow) problems.push('가로 넘침')
    if (got.headerPadTop < 16 + inset.top) problems.push(`헤더 위 여백 ${got.headerPadTop}px(기대 ${16 + inset.top} 이상)`)
    if (got.padRight < 12 + inset.right) problems.push(`오른쪽 여백 ${got.padRight}px(기대 ${12 + inset.right} 이상)`)
    if (!got.coarse) problems.push('터치 흉내 안 됨')
    if (got.clipped.length > 0) problems.push(`글자 잘림: ${got.clipped.join(' / ')}`)
    if (shots) {
        await screenshot(win, path.join(outDir, `${id}.png`))
        await win.webContents.executeJavaScript('window.scrollTo(0, document.documentElement.scrollHeight)')
        await sleep(150)
        await screenshot(win, path.join(outDir, `${id}-end.png`))
    }
    return {
        기기: id,
        데이터: seedName,
        뷰포트: `${d.width}×${d.height}`,
        열: got.columns,
        헤더고정: got.sticky,
        넘침: got.overflow,
        결과: problems.length === 0 ? 'OK' : problems.join(', '),
    }
}

/** 폴드를 켠 채로 펼치기: 다시 읽지 않고 뷰포트만 커버 → 펼침으로 바꿔도 1열 → 2열이 되어야 한다. */
async function checkUnfold(win) {
    await emulate(win, DEVICES['fold8-cover'])
    await loadWithSeed(win, null)
    const before = (await inspect(win)).columns
    await emulate(win, DEVICES['fold8-open'])
    await sleep(300)
    const after = (await inspect(win)).columns
    return {
        기기: 'unfold',
        데이터: '기본',
        뷰포트: '475×751 → 933×704',
        열: `${before}→${after}`,
        헤더고정: '-',
        넘침: '-',
        결과: before === 1 && after === 2 ? 'OK' : '펼쳐도 열 개수가 바뀌지 않음',
    }
}

/** PC(마우스): 선택된 탭 위에 마우스를 올려도 글자가 보여야 한다. */
async function checkPcHover(win) {
    const dbg = win.webContents.debugger
    const run = script => win.webContents.executeJavaScript(script)
    await dbg.sendCommand('Emulation.clearDeviceMetricsOverride')
    await dbg.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: false })
    await loadWithSeed(win, null)
    const at = await run(`(() => {
        const r = document.querySelector('.tab[aria-selected="true"]').getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })()`)
    await dbg.sendCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y })
    await sleep(300) // 색 전환(0.15s)이 끝날 때까지
    const tab = await run(`(() => {
        const el = document.querySelector('.tab[aria-selected="true"]')
        const s = getComputedStyle(el)
        return { hovered: el.matches(':hover'), color: s.color, background: s.backgroundColor }
    })()`)
    let result = 'OK'
    if (!tab.hovered) result = '마우스 올림 흉내 안 됨'
    else if (tab.color === tab.background) result = `선택된 탭 글자 안 보임(${tab.color})`
    return { 기기: 'pc-hover', 데이터: '기본', 뷰포트: 'PC 창', 열: '-', 헤더고정: '-', 넘침: '-', 결과: result }
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
        const outDir = path.resolve(args.out ?? '.shots/devices')
        const rows = []
        if (args.seed !== null) {
            for (const id of ids) rows.push(await checkDevice(win, id, path.basename(args.seed), readSeed(args.seed), outDir, true))
        } else if (args.device === 'all') {
            for (const [name, file] of Object.entries(SEEDS)) {
                const seed = readSeed(file)
                for (const id of ids) rows.push(await checkDevice(win, id, name, seed, outDir, file === null))
            }
            rows.push(await checkUnfold(win))
            rows.push(await checkPcHover(win))
        } else {
            for (const id of ids) rows.push(await checkDevice(win, id, '기본', null, outDir, true))
        }
        console.table(rows)
        console.log(`screenshots: ${outDir}`)
        app.exit(rows.every(r => r.결과 === 'OK') ? 0 : 1)
    } catch (e) {
        console.error(e)
        app.exit(1)
    }
})
