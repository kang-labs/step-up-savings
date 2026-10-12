import { describe, expect, it } from 'vitest'
import { groupByYear, listPaydays, parseYMD } from './savings.ts'

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
