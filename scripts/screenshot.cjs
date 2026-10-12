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
