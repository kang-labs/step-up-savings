import { describe, expect, it } from 'vitest'
import { calcPlan, groupByYear, listPaydays, parseYMD, type PlanInput, type PlanResult } from './savings.ts'

const ymd = (s: string) => parseYMD(s)!

function months(current: string, end: string, payday = 21) {
    return listPaydays(ymd(current), ymd(end), payday).length
}

describe('parseYMD', () => {
    it('parses a valid date', () => {
        expect(parseYMD('2026-04-21')).toEqual({ y: 2026, m: 4, d: 21 })
    })

    it('rejects empty, malformed and impossible dates', () => {
        expect(parseYMD('')).toBeNull()
        expect(parseYMD('2026-4-21')).toBeNull()
        expect(parseYMD('2026-02-30')).toBeNull()
        expect(parseYMD('2026-13-01')).toBeNull()
    })

    it('accepts Feb 29 only in leap years', () => {
        expect(parseYMD('2028-02-29')).not.toBeNull()
        expect(parseYMD('2027-02-29')).toBeNull()
    })
})

describe('listPaydays — 남은 개월 수', () => {
    it('counts the current month when entered before payday', () => {
        expect(months('2025-11-13', '2029-12-31')).toBe(50)
        expect(months('2026-01-05', '2029-12-31')).toBe(48)
        expect(months('2026-04-20', '2029-12-31')).toBe(45)
    })

    it('excludes the current month from payday itself onward', () => {
        expect(months('2026-04-21', '2029-12-31')).toBe(44)
        expect(months('2026-04-22', '2029-12-31')).toBe(44)
    })

    it('counts the completion month only when its payday is on or before the end date', () => {
        expect(months('2026-10-12', '2029-08-30')).toBe(35)
        expect(months('2026-10-12', '2029-08-21')).toBe(35)
        expect(months('2026-10-12', '2029-08-20')).toBe(34)
    })

    it('uses the last day of the month when payday does not exist in that month', () => {
        expect(listPaydays(ymd('2027-01-31'), ymd('2027-03-31'), 31)).toEqual([
            { y: 2027, m: 2, d: 28 },
            { y: 2027, m: 3, d: 31 },
        ])
        expect(listPaydays(ymd('2028-01-31'), ymd('2028-02-29'), 31)).toEqual([{ y: 2028, m: 2, d: 29 }])
    })

    it('returns nothing when no payday falls in the range', () => {
        expect(months('2026-10-22', '2026-11-20')).toBe(0)
        expect(months('2026-10-12', '2026-01-01')).toBe(0)
    })
})

describe('groupByYear', () => {
    it('groups paydays by calendar year in order', () => {
        const rows = groupByYear(listPaydays(ymd('2026-10-12'), ymd('2029-08-20'), 21))
        expect(rows).toEqual([
            { year: 2026, months: 3 },
            { year: 2027, months: 12 },
            { year: 2028, months: 12 },
            { year: 2029, months: 7 },
        ])
    })

    it('returns an empty list for no paydays', () => {
        expect(groupByYear([])).toEqual([])
    })
})

const base: PlanInput = {
    goal: 100_000_000,
    asset: 0,
    currentDate: '2026-01-05',
    endDate: '2029-12-31',
    payday: 21,
    stepUp: 100_000,
}

function okResult(r: PlanResult) {
    if (r.status !== 'ok') throw new Error(`expected ok, got ${JSON.stringify(r)}`)
    return r
}

function stepRows(r: PlanResult) {
    const ok = okResult(r)
    if (!ok.stepUp.ok) throw new Error('expected a step-up schedule')
    return ok.stepUp.rows.map(row => [row.year, row.months, row.monthly])
}

describe('calcPlan — 엑셀 대조값', () => {
    it('2026-01-05, 자산 27,504,909, 13만원 증액', () => {
        const r = calcPlan({ ...base, currentDate: '2026-01-05', asset: 27_504_909, stepUp: 130_000 })
        expect(okResult(r)).toMatchObject({ diff: 72_495_091, months: 48, flatMonthly: 1_510_315 })
        expect(stepRows(r)).toEqual([
            [2026, 12, 1_315_315],
            [2027, 12, 1_445_315],
            [2028, 12, 1_575_315],
            [2029, 12, 1_705_315],
        ])
    })

    it('2026-04-21 (월급날 당일), 자산 33,652,620, 13만원 증액', () => {
        const r = calcPlan({ ...base, currentDate: '2026-04-21', asset: 33_652_620, stepUp: 130_000 })
        expect(okResult(r)).toMatchObject({ diff: 66_347_380, months: 44, flatMonthly: 1_507_895 })
        expect(stepRows(r)).toEqual([
            [2026, 8, 1_295_168],
            [2027, 12, 1_425_168],
            [2028, 12, 1_555_168],
            [2029, 12, 1_685_168],
        ])
    })

    it('2025-11-13 은 2025년이 첫해', () => {
        const r = calcPlan({ ...base, currentDate: '2025-11-13', asset: 26_117_974 })
        expect(okResult(r)).toMatchObject({ diff: 73_882_026, months: 50, flatMonthly: 1_477_641 })
        expect(stepRows(r)).toEqual([
            [2025, 2, 1_237_641],
            [2026, 12, 1_337_641],
            [2027, 12, 1_437_641],
            [2028, 12, 1_537_641],
            [2029, 12, 1_637_641],
        ])
    })
})

describe('calcPlan — 규칙과 경계', () => {
    it('reaches the goal: totals cover the gap by less than one won per month', () => {
        const r = okResult(calcPlan({ ...base, asset: 27_504_909, stepUp: 130_000 }))
        if (!r.stepUp.ok) throw new Error('expected a step-up schedule')
        for (const row of r.stepUp.rows) expect(row.yearTotal).toBe(row.monthly * row.months)
        expect(r.stepUp.total).toBe(r.stepUp.rows.reduce((sum, row) => sum + row.yearTotal, 0))
        expect(r.stepUp.total).toBeGreaterThanOrEqual(r.diff)
        expect(r.stepUp.total - r.diff).toBeLessThan(r.months)
        expect(r.flatMonthly * r.months).toBeGreaterThanOrEqual(r.diff)
    })

    it('starts the first year next year when no payday is left this year', () => {
        const r = calcPlan({ ...base, currentDate: '2026-12-25' })
        expect(okResult(r).months).toBe(36)
        expect(stepRows(r)[0][0]).toBe(2027)
    })

    it('reports the next payday', () => {
        expect(okResult(calcPlan({ ...base, currentDate: '2026-10-12' })).nextPayday).toEqual({ y: 2026, m: 10, d: 21 })
        expect(okResult(calcPlan({ ...base, currentDate: '2026-10-21' })).nextPayday).toEqual({ y: 2026, m: 11, d: 21 })
    })

    it('makes every year equal when the yearly increase is 0', () => {
        const r = calcPlan({ ...base, asset: 27_504_909, stepUp: 0 })
        const flat = okResult(r).flatMonthly
        expect(stepRows(r).map(row => row[2])).toEqual([flat, flat, flat, flat])
    })

    it('flags a yearly increase too large for the gap but still gives the flat amount', () => {
        const r = okResult(calcPlan({ ...base, goal: 1_000_000, stepUp: 1_000_000 }))
        expect(r.flatMonthly).toBe(20_834)
        expect(r.stepUp).toEqual({ ok: false })
    })

    it('reports an already reached goal', () => {
        expect(calcPlan({ ...base, asset: 100_000_000 })).toEqual({ status: 'achieved', diff: 0 })
        expect(calcPlan({ ...base, asset: 120_000_000 })).toEqual({ status: 'achieved', diff: -20_000_000 })
    })

    it('reports no remaining months', () => {
        expect(calcPlan({ ...base, currentDate: '2026-10-22', endDate: '2026-11-20' })).toEqual({ status: 'noMonths', diff: 100_000_000 })
        expect(calcPlan({ ...base, currentDate: '2030-01-01' })).toEqual({ status: 'noMonths', diff: 100_000_000 })
    })

    it('reports invalid dates and paydays', () => {
        expect(calcPlan({ ...base, currentDate: '' })).toEqual({ status: 'invalid' })
        expect(calcPlan({ ...base, endDate: '2029-02-30' })).toEqual({ status: 'invalid' })
        expect(calcPlan({ ...base, payday: 0 })).toEqual({ status: 'invalid' })
        expect(calcPlan({ ...base, payday: 32 })).toEqual({ status: 'invalid' })
    })
})
