// plans.ts 의 상태 전이를 React 상태로 감싸고, 바뀔 때마다 localStorage 에 저장한다.
import { useEffect, useState } from 'react'
import { STORAGE_KEY, addPlan, initialState, parseState, removePlan, selectPlan, updatePlan, type PlanPatch, type PlansState } from '../lib/plans.ts'

// file:// 에서도 동작하도록 crypto.randomUUID 대신 시간 + 난수로 만든다.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function load(): PlansState {
    try {
        return parseState(localStorage.getItem(STORAGE_KEY)) ?? initialState(newId)
    } catch {
        return initialState(newId)
    }
}

export function usePlans() {
    const [state, setState] = useState(load)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch {
            // 저장할 수 없어도 계산은 계속 동작해야 한다.
        }
    }, [state])

    const active = state.plans.find(p => p.id === state.activeId) ?? state.plans[0]

    return {
        plans: state.plans,
        active,
        select: (id: string) => setState(s => selectPlan(s, id)),
        add: () => setState(s => addPlan(s, newId())),
        update: (id: string, patch: PlanPatch) => setState(s => updatePlan(s, id, patch)),
        remove: (id: string) => setState(s => removePlan(s, id)),
    }
}
