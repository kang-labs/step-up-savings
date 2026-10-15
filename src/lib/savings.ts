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

export type PlanInput = {
    goal: number
    asset: number
    currentDate: string
    endDate: string
    payday: number
    stepUp: number
    /** 연수익률 × 100 (3.25% → 325). 없거나 0 이면 수익 없음. */
    returnBp?: number
}

export type YearRow = { year: number; months: number; monthly: number; yearTotal: number }

/**
 * ok: false = 첫해 월 저축액이 0원 이하가 될 만큼 연간 증액액이 크다.
 * total = 넣는 돈 합계, profit = 예상 수익(수익 없으면 0).
 */
export type StepUpResult = { ok: true; rows: YearRow[]; total: number; profit: number } | { ok: false }

export type PlanResult =
    | { status: 'invalid' }
    | { status: 'achieved'; diff: number }
    | { status: 'noMonths'; diff: number }
    /** 현재자산만 불려도 완료날짜에 목표 이상. finalAsset = 그때 금액(내림). */
    | { status: 'grown'; diff: number; months: number; nextPayday: YMD; finalAsset: number }
    | {
          status: 'ok'
          diff: number
          months: number
          nextPayday: YMD
          flatMonthly: number
          flatProfit: number
          stepUp: StepUpResult
      }

/**
 * 적금식 수익: 그해 시작 금액은 1 + r·m/12 배, 그해 j 번째로 넣은 돈은 1 + r·(m − j)/12 배, 연말에 합쳐 다음 해로(복리).
 * perYear[i] = i 번째 해에 매달 1원씩 넣은 돈의 완료날짜 가치, assetGrowth = 현재자산 1원의 완료날짜 가치.
 * r = 0 이면 perYear = 개월 수, assetGrowth = 1.
 */
export function growthFactors(byYear: YearMonths[], r: number): { perYear: number[]; assetGrowth: number } {
    const perYear: number[] = []
    let assetGrowth = 1
    // 뒤 해부터 거꾸로 곱해 가며 '이 해 뒤로 남은 해들의 배수' 를 만든다.
    for (let i = byYear.length - 1; i >= 0; i--) {
        const m = byYear[i].months
        perYear[i] = (m + (r * m * (m - 1)) / 24) * assetGrowth
        assetGrowth *= 1 + (r * m) / 12
    }
    return { perYear, assetGrowth }
}

/** 수익 계산의 소수 오차로 1원이 더 올라가지 않게 아주 작은 값을 빼고 올린다. */
function ceilWon(v: number): number {
    return Math.ceil(v - 1e-6)
}

/**
 * 첫해(i = 0) 월 x, 다음 해 x + 증액액 … 일 때 Σ 월액_i × perYear_i = need 가 되는 x 를 구한다.
 * x = ceil((need − 증액액 × Σ i·perYear_i) / Σ perYear_i). 수익이 없으면 perYear_i = 개월 수, need = 차액.
 */
export function calcStepUp(need: number, byYear: YearMonths[], perYear: number[], stepUp: number): YearRow[] | null {
    const sum = perYear.reduce((a, f) => a + f, 0)
    const weighted = perYear.reduce((a, f, i) => a + i * f, 0)
    const first = ceilWon((need - stepUp * weighted) / sum)
    if (first <= 0) return null
    return byYear.map((r, i) => {
        const monthly = first + i * stepUp
        return { year: r.year, months: r.months, monthly, yearTotal: monthly * r.months }
    })
}

export function calcPlan(input: PlanInput): PlanResult {
    const current = parseYMD(input.currentDate)
    const end = parseYMD(input.endDate)
    const paydayValid = Number.isInteger(input.payday) && input.payday >= 1 && input.payday <= 31
    if (current === null || end === null || !paydayValid) return { status: 'invalid' }

    const diff = input.goal - input.asset
    if (diff <= 0) return { status: 'achieved', diff }

    const paydays = listPaydays(current, end, input.payday)
    if (paydays.length === 0) return { status: 'noMonths', diff }

    const byYear = groupByYear(paydays)
    const { perYear, assetGrowth } = growthFactors(byYear, (input.returnBp ?? 0) / 10_000)
    const grownAsset = input.asset * assetGrowth
    const need = input.goal - grownAsset // 넣는 돈으로 채워야 할 완료날짜 금액
    const months = paydays.length
    const nextPayday = paydays[0]
    if (need <= 0) return { status: 'grown', diff, months, nextPayday, finalAsset: Math.floor(grownAsset) }

    /** 예상 수익 = 완료날짜 금액 − 현재자산 − 넣는 돈. 수익이 없으면 0. */
    const profit = (monthlies: number[]) => {
        const final = monthlies.reduce((a, x, i) => a + x * perYear[i], grownAsset)
        const deposits = monthlies.reduce((a, x, i) => a + x * byYear[i].months, 0)
        return Math.max(Math.floor(final - input.asset - deposits + 1e-6), 0)
    }
    const sum = perYear.reduce((a, f) => a + f, 0)
    const flatMonthly = ceilWon(need / sum)
    const rows = calcStepUp(need, byYear, perYear, input.stepUp)

    return {
        status: 'ok',
        diff,
        months,
        nextPayday,
        flatMonthly,
        flatProfit: profit(byYear.map(() => flatMonthly)),
        stepUp:
            rows === null
                ? { ok: false }
                : { ok: true, rows, total: rows.reduce((a, r) => a + r.yearTotal, 0), profit: profit(rows.map(r => r.monthly)) },
    }
}
