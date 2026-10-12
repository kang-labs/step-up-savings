import { describe, expect, it } from 'vitest'
import { addPlan, createPlan, initialState, parseState, planLabel, removePlan, selectPlan, updatePlan, type PlansState } from './plans.ts'

function stateOf(ids: string[], activeId = ids[0]): PlansState {
    return { plans: ids.map(id => createPlan(id)), activeId }
}

describe('createPlan / initialState', () => {
    it('uses the spec defaults', () => {
        expect(createPlan('a')).toEqual({
            id: 'a',
            name: '',
            goal: 100_000_000,
            currentDate: null,
            endDate: '2029-12-31',
            asset: 0,
            payday: 21,
            stepUp: 100_000,
        })
    })

    it('starts with one active default plan', () => {
        expect(initialState(() => 'a')).toEqual(stateOf(['a']))
    })
})

describe('planLabel', () => {
    it('falls back to the goal amount when the name is blank', () => {
        expect(planLabel(createPlan('a'))).toBe('1억 목표')
        expect(planLabel({ ...createPlan('a'), name: '  ', goal: 50_000_000 })).toBe('5,000만 목표')
        expect(planLabel({ ...createPlan('a'), name: ' 내 집 ' })).toBe('내 집')
    })
})

describe('state transitions', () => {
    it('addPlan appends a default plan and activates it', () => {
        const next = addPlan(stateOf(['a']), 'b')
        expect(next.plans.map(p => p.id)).toEqual(['a', 'b'])
        expect(next.plans[1]).toEqual(createPlan('b'))
        expect(next.activeId).toBe('b')
    })

    it('updatePlan changes only the target plan', () => {
        const next = updatePlan(stateOf(['a', 'b']), 'b', { asset: 5_000, name: '비상금' })
        expect(next.plans[0]).toEqual(createPlan('a'))
        expect(next.plans[1]).toMatchObject({ id: 'b', asset: 5_000, name: '비상금' })
    })

    it('selectPlan ignores unknown ids', () => {
        const state = stateOf(['a', 'b'])
        expect(selectPlan(state, 'b').activeId).toBe('b')
        expect(selectPlan(state, 'zzz')).toBe(state)
    })

    it('removePlan moves the selection to the next plan, or the previous one at the end', () => {
        expect(removePlan(stateOf(['a', 'b', 'c'], 'b'), 'b')).toMatchObject({ activeId: 'c' })
        expect(removePlan(stateOf(['a', 'b', 'c'], 'c'), 'c')).toMatchObject({ activeId: 'b' })
    })

    it('removePlan keeps the selection when another plan is removed', () => {
        const next = removePlan(stateOf(['a', 'b', 'c'], 'a'), 'c')
        expect(next.plans.map(p => p.id)).toEqual(['a', 'b'])
        expect(next.activeId).toBe('a')
    })

    it('removePlan never removes the last plan', () => {
        const state = stateOf(['a'])
        expect(removePlan(state, 'a')).toBe(state)
    })
})

describe('parseState', () => {
    it('returns null for missing, broken or empty data', () => {
        expect(parseState(null)).toBeNull()
        expect(parseState('')).toBeNull()
        expect(parseState('not json')).toBeNull()
        expect(parseState('[]')).toBeNull()
        expect(parseState('{}')).toBeNull()
        expect(parseState('{"plans":[],"activeId":"a"}')).toBeNull()
    })

    it('round-trips a saved state', () => {
        const state = updatePlan(addPlan(stateOf(['a']), 'b'), 'a', { currentDate: '2026-01-05' })
        expect(parseState(JSON.stringify(state))).toEqual(state)
    })

    it('drops malformed plans but keeps the good ones', () => {
        const raw = JSON.stringify({
            plans: [createPlan('a'), { ...createPlan('b'), payday: null }, { id: 'c' }],
            activeId: 'a',
        })
        expect(parseState(raw)).toEqual(stateOf(['a']))
    })

    it('points a dangling activeId at the first plan', () => {
        const raw = JSON.stringify({ plans: [createPlan('a'), createPlan('b')], activeId: 'gone' })
        expect(parseState(raw)?.activeId).toBe('a')
    })
})
