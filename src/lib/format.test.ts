import { describe, expect, it } from 'vitest'
import { MAX_MONEY, caretAfterDigits, compactWon, formatWon, formatYMD, koreanUnit, moneyHint, parseMoney, todayISO } from './format.ts'

describe('formatWon', () => {
    it('adds thousands separators', () => {
        expect(formatWon(72_495_091)).toBe('72,495,091')
        expect(formatWon(0)).toBe('0')
    })
})

describe('parseMoney', () => {
    it('keeps digits only, so pasted text with commas and 원 works', () => {
        expect(parseMoney('26,117,974원')).toBe(26_117_974)
        expect(parseMoney(' 1 000 ')).toBe(1_000)
    })

    it('treats an empty or digit-less field as 0', () => {
        expect(parseMoney('')).toBe(0)
        expect(parseMoney('원')).toBe(0)
    })

    it('caps absurdly long input', () => {
        expect(parseMoney('9'.repeat(30))).toBe(MAX_MONEY)
    })
})

describe('koreanUnit', () => {
    it('writes amounts in 억 and 만, dropping anything under 만', () => {
        expect(koreanUnit(100_000_000)).toBe('1억')
        expect(koreanUnit(72_495_091)).toBe('7,249만')
        expect(koreanUnit(50_000_000)).toBe('5,000만')
        expect(koreanUnit(130_000_000)).toBe('1억 3,000만')
        expect(koreanUnit(9_999)).toBe('9,999')
        expect(koreanUnit(0)).toBe('0')
    })
})

describe('moneyHint', () => {
    it('says 약 only when it rounds', () => {
        expect(moneyHint(100_000_000)).toBe('1억 원')
        expect(moneyHint(72_495_091)).toBe('약 7,249만 원')
        expect(moneyHint(100_000)).toBe('10만 원')
    })

    it('stays empty under 만 원', () => {
        expect(moneyHint(0)).toBe('')
        expect(moneyHint(9_999)).toBe('')
    })
})

describe('compactWon', () => {
    it('shortens amounts for chart labels', () => {
        expect(compactWon(1_315_315)).toBe('131.5만')
        expect(compactWon(1_510_315)).toBe('151만')
        expect(compactWon(250_000_000)).toBe('2.5억')
        expect(compactWon(9_999)).toBe('9,999')
    })
})

describe('dates', () => {
    it('todayISO uses the local calendar date', () => {
        expect(todayISO(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12')
        expect(todayISO(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05')
    })

    it('formatYMD pads month and day', () => {
        expect(formatYMD({ y: 2026, m: 1, d: 5 })).toBe('2026.01.05')
    })
})

describe('caretAfterDigits', () => {
    it('puts the caret right after the n-th digit, skipping commas', () => {
        expect(caretAfterDigits('1,234,567', 4)).toBe(5)
        expect(caretAfterDigits('15,234', 2)).toBe(2)
        expect(caretAfterDigits('1,234', 0)).toBe(0)
    })

    it('falls back to the end when there are fewer digits', () => {
        expect(caretAfterDigits('1,234', 9)).toBe(5)
        expect(caretAfterDigits('', 3)).toBe(0)
    })
})
