// 플랜(목표 하나에 대한 입력 묶음) 모델과 상태 전이. React 와 무관한 순수 함수.
import { MAX_MONEY, koreanUnit } from './format.ts'

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
    if (plans.length === 0) return state // id 가 겹친 비정상 상태에서도 목록을 비우지 않는다.
    const activeId = state.activeId === id ? plans[Math.min(index, plans.length - 1)].id : state.activeId
    return { plans, activeId }
}

/** 입력칸에서 만들 수 있는 금액: 0 ~ MAX_MONEY 정수 */
function isMoney(value: unknown): boolean {
    return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_MONEY
}

// 타입뿐 아니라 화면에서 만들 수 있는 값의 범위까지 확인한다 — 손상된 값이 계산·차트를 망가뜨리지 않게.
function isPlan(value: unknown): value is Plan {
    if (typeof value !== 'object' || value === null) return false
    const p = value as Record<string, unknown>
    return (
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        isMoney(p.goal) &&
        (p.currentDate === null || typeof p.currentDate === 'string') &&
        typeof p.endDate === 'string' &&
        isMoney(p.asset) &&
        Number.isInteger(p.payday) &&
        (p.payday as number) >= 1 &&
        (p.payday as number) <= 31 &&
        isMoney(p.stepUp)
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
    // id 가 겹치면 탭 선택·삭제가 꼬이므로 처음 것만 남긴다.
    const seen = new Set<string>()
    const valid = plans.filter(isPlan).filter(p => !seen.has(p.id) && seen.add(p.id))
    if (valid.length === 0) return null
    const active = valid.find(p => p.id === activeId) ?? valid[0]
    return { plans: valid, activeId: active.id }
}
