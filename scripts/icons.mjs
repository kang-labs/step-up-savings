// 아이콘 원본(assets/icon.svg) 하나로 PC exe·Play·앱 로고·안드로이드 런처 아이콘과 시작 화면을 모두 만든다.
// 사용: npm run icons
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const source = readFileSync('assets/icon.svg', 'utf8')
const RES = 'android/app/src/main/res'

/** 레이어 하나를 뺀 SVG — 적응형 아이콘은 배경과 전경을 따로 넘긴다. */
const without = id => source.replace(new RegExp(`<g id="${id}">[\\s\\S]*?</g>`), '')
/** 마스크 없이 보이는 가운데 72 단위만 남긴 SVG — Play·exe·앱 로고처럼 그대로 보여 줄 곳에 쓴다. */
const visible = source.replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"')

/** SVG 를 size×size PNG 버퍼로 */
function render(svg, size) {
    return sharp(Buffer.from(svg.replace('<svg ', `<svg width="${size}" height="${size}" `))).png().toBuffer()
}

/** mask(SVG 도형) 밖을 투명하게 잘라 낸 PNG 버퍼 */
async function masked(svg, size, shape) {
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${shape}</svg>`)
    return sharp(await render(svg, size)).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

/** 모서리를 둥글게(반지름 = 크기 × ratio) */
const rounded = (svg, size, ratio) => {
    const r = Math.round(size * ratio)
    return masked(svg, size, `<rect width="${size}" height="${size}" rx="${r}" ry="${r}"/>`)
}

/** 원형 */
const circle = (svg, size) => masked(svg, size, `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/>`)

const outputs = {
    'build/icon.png': rounded(visible, 512, 0.22), // PC exe (electron-builder 가 자동 사용)
    'store/icon-512.png': render(visible, 512), // Play 아이콘 (모서리는 Play 가 둥글게 처리)
    [`${RES}/drawable-nodpi/splash_icon.png`]: rounded(visible, 512, 0.22), // 시작 화면 가운데 아이콘
}

// 안드로이드 런처 아이콘: 적응형 아이콘 레이어는 108dp, 예전 방식(안드로이드 7) 아이콘은 48dp. 밀도별로 만든다.
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [name, scale] of Object.entries(DENSITIES)) {
    const dir = `${RES}/mipmap-${name}`
    const layer = Math.round(108 * scale)
    const legacy = Math.round(48 * scale)
    outputs[`${dir}/ic_launcher_foreground.png`] = render(without('background'), layer)
    outputs[`${dir}/ic_launcher_background.png`] = render(without('foreground'), layer)
    outputs[`${dir}/ic_launcher.png`] = rounded(visible, legacy, 0.18)
    outputs[`${dir}/ic_launcher_round.png`] = circle(visible, legacy)
}

for (const [file, buffer] of Object.entries(outputs)) {
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, await buffer)
    console.log(`wrote ${file}`)
}

const ADAPTIVE = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`
const SPLASH = `<?xml version="1.0" encoding="utf-8"?>
<!-- 시작 화면(안드로이드 11 이하, 12 이상은 시스템이 앱 아이콘으로 그림): 아이보리 바탕 가운데 아이콘. 화면비와 상관없이 찌그러지지 않는다. -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <color android:color="#F6F2EA" />
    </item>
    <item android:width="120dp" android:height="120dp" android:gravity="center" android:drawable="@drawable/splash_icon" />
</layer-list>
`
const xmlFiles = {
    [`${RES}/mipmap-anydpi-v26/ic_launcher.xml`]: ADAPTIVE,
    [`${RES}/mipmap-anydpi-v26/ic_launcher_round.xml`]: ADAPTIVE,
    [`${RES}/drawable/splash.xml`]: SPLASH,
}

// 템플릿의 기본 아이콘·시작 화면 비트맵은 지운다(같은 이름의 splash.png 가 남으면 splash.xml 보다 먼저 쓰인다).
const stale = [`${RES}/drawable-v24/ic_launcher_foreground.xml`, `${RES}/drawable/ic_launcher_background.xml`, `${RES}/values/ic_launcher_background.xml`]
for (const dir of readdirSync(RES).filter(d => d.startsWith('drawable'))) stale.push(`${RES}/${dir}/splash.png`)
for (const file of stale) {
    if (existsSync(file)) {
        rmSync(file)
        console.log(`removed ${file}`)
    }
}
for (const dir of readdirSync(RES).filter(d => d.startsWith('drawable'))) {
    if (readdirSync(`${RES}/${dir}`).length === 0) rmSync(`${RES}/${dir}`, { recursive: true })
}

for (const [file, text] of Object.entries(xmlFiles)) {
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, text)
    console.log(`wrote ${file}`)
}

mkdirSync('src/assets', { recursive: true })
writeFileSync('src/assets/logo.svg', visible)
console.log('wrote src/assets/logo.svg')
