import { describe, expect, it } from 'vitest'
import { chartLabels, valueLabelY } from './chart.ts'

describe('chartLabels', () => {
    it('shows every label when bars are wide', () => {
        expect(chartLabels(4, 92)).toEqual({
            value: [true, true, true, true],
            year: [true, true, true, true],
            months: true,
        })
    })

    it('thins labels out for a far completion date so they never overlap', () => {
        const labels = chartLabels(20, 18.4)
        expect(labels.value.filter(Boolean)).toHaveLength(2)
        expect(labels.value[0]).toBe(true)
        expect(labels.value[19]).toBe(true)
        expect(labels.year.map((shown, i) => (shown ? i : -1)).filter(i => i >= 0)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18])
        expect(labels.months).toBe(false)
    })

    it('handles a single bar', () => {
        expect(chartLabels(1, 368)).toEqual({ value: [true], year: [true], months: true })
    })

    it('always shows the amount of the year the user tapped', () => {
        const labels = chartLabels(20, 18.4, 7)
        expect(labels.value[7]).toBe(true)
        expect(labels.value.filter(Boolean)).toHaveLength(3)
    })

    it('ignores a tapped year that no longer exists', () => {
        expect(chartLabels(4, 92, 9).value).toEqual([true, true, true, true])
    })
})

describe('valueLabelY', () => {
    it('puts the amount just above the bar when the flat line is far away', () => {
        expect(valueLabelY(100, 50)).toBe(92)
        expect(valueLabelY(60, 100)).toBe(52)
    })

    it('keeps the label above the flat line when the line would cross the text', () => {
        // 막대가 균등선보다 조금 낮으면 막대 위 라벨이 점선에 걸린다 → 점선 바로 위로 올린다.
        expect(valueLabelY(100, 88)).toBe(82)
        expect(valueLabelY(73.6, 58.5)).toBeCloseTo(52.5)
    })

    it('leaves the label alone when the line sits on the bar top', () => {
        expect(valueLabelY(100, 100)).toBe(92)
    })
})
