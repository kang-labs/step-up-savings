// 플랜(목표 하나에 대한 입력 묶음) 모델과 상태 전이. React 와 무관한 순수 함수.
import { koreanUnit } from './format.ts'

export type Plan = {
    id: string
    /** 비어 있으면 탭에 '1억 목표'처럼 목표금액으로 표시한다. */
    name: string
    goal: number
    /** 'YYYY-MM-DD'. null 이면 항상 오늘 날짜로 계산한다. */
    currentDate: string | null
    endDate: string
    asset: number
    payday: number
    stepUp: number
}

export type PlanPatch = Partial<Omit<Plan, 'id'>>

export type PlansState = { plans: Plan[]; activeId: string }

export const STORAGE_KEY = 'step-up-savings/v1'

export function createPlan(id: string): Plan {
    return {
        id,
        name: '',
        goal: 100_000_000,
        currentDate: null,
        endDate: '2029-12-31',
        asset: 0,
        payday: 21,
        stepUp: 100_000,
    }
}

export function initialState(newId: () => string): PlansState {
    const plan = createPlan(newId())
    return { plans: [plan], activeId: plan.id }
}

export function planLabel(plan: Plan): string {
    return plan.name.trim() || `${koreanUnit(plan.goal)} 목표`
}

export function addPlan(state: PlansState, id: string): PlansState {
    return { plans: [...state.plans, createPlan(id)], activeId: id }
}

export function updatePlan(state: PlansState, id: string, patch: PlanPatch): PlansState {
    return { ...state, plans: state.plans.map(p => (p.id === id ? { ...p, ...patch } : p)) }
}

export function selectPlan(state: PlansState, id: string): PlansState {
    return state.plans.some(p => p.id === id) ? { ...state, activeId: id } : state
}

/** 마지막 하나는 지우지 않는다. 보고 있던 플랜을 지우면 다음(없으면 이전) 플랜으로 옮긴다. */
export function removePlan(state: PlansState, id: string): PlansState {
    const index = state.plans.findIndex(p => p.id === id)
    if (state.plans.length <= 1 || index === -1) return state
    const plans = state.plans.filter(p => p.id !== id)
    const activeId = state.activeId === id ? plans[Math.min(index, plans.length - 1)].id : state.activeId
    return { plans, activeId }
}

function isPlan(value: unknown): value is Plan {
    if (typeof value !== 'object' || value === null) return false
    const p = value as Record<string, unknown>
    return (
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.goal === 'number' &&
        (p.currentDate === null || typeof p.currentDate === 'string') &&
        typeof p.endDate === 'string' &&
        typeof p.asset === 'number' &&
        typeof p.payday === 'number' &&
        typeof p.stepUp === 'number'
    )
}

/** 저장된 JSON 을 검증해 읽는다. 쓸 수 있는 플랜이 하나도 없으면 null. */
export function parseState(raw: string | null): PlansState | null {
    if (!raw) return null
    let data: unknown
    try {
        data = JSON.parse(raw)
    } catch {
        return null
    }
    if (typeof data !== 'object' || data === null) return null
    const { plans, activeId } = data as { plans?: unknown; activeId?: unknown }
    if (!Array.isArray(plans)) return null
    const valid = plans.filter(isPlan)
    if (valid.length === 0) return null
    const active = valid.find(p => p.id === activeId) ?? valid[0]
    return { plans: valid, activeId: active.id }
}
