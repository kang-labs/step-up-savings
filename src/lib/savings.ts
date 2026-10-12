// 증액저축 계산 — 화면과 무관한 순수 함수만 둔다.
// 날짜는 'YYYY-MM-DD' 문자열을 {y, m, d} 정수로 바꿔 비교한다(시간대 영향 없음).

export type YMD = { y: number; m: number; d: number }

export type YearMonths = { year: number; months: number }

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(y: number, m: number): number {
    return m === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[m - 1]
}

/** 'YYYY-MM-DD' → {y, m, d}. 형식이 틀리거나 없는 날짜면 null. */
export function parseYMD(s: string): YMD | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (match === null) return null
    const y = Number(match[1])
    const m = Number(match[2])
    const d = Number(match[3])
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
    return { y, m, d }
}

function toKey(p: YMD): number {
    return p.y * 10_000 + p.m * 100 + p.d
}

/**
 * 현재날짜 < 월급날 ≤ 완료날짜 인 월급날 목록.
 * 월급날 당일부터는 이미 받은 것으로 보고, 그 달에 없는 날(31일 등)은 말일로 본다.
 */
export function listPaydays(current: YMD, end: YMD, payday: number): YMD[] {
    const result: YMD[] = []
    const from = toKey(current)
    const to = toKey(end)
    let y = current.y
    let m = current.m
    while (y < end.y || (y === end.y && m <= end.m)) {
        const day: YMD = { y, m, d: Math.min(payday, daysInMonth(y, m)) }
        const key = toKey(day)
        if (key > from && key <= to) result.push(day)
        m += 1
        if (m > 12) {
            y += 1
            m = 1
        }
    }
    return result
}

/** 월급날 목록을 연도별 개월 수로 묶는다. */
export function groupByYear(paydays: YMD[]): YearMonths[] {
    const rows: YearMonths[] = []
    for (const p of paydays) {
        const last = rows.at(-1)
        if (last !== undefined && last.year === p.y) last.months += 1
        else rows.push({ year: p.y, months: 1 })
    }
    return rows
}
