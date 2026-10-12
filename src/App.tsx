import { DeletePlan } from './components/DeletePlan.tsx'
import { PlanForm } from './components/PlanForm.tsx'
import { PlanTabs } from './components/PlanTabs.tsx'
import { usePlans } from './hooks/usePlans.ts'
import { todayISO } from './lib/format.ts'

export default function App() {
    const { plans, active, select, add, update, remove } = usePlans()
    const today = todayISO()

    return (
        <div className="app">
            <header className="app-header">
                <div className="brand">
                    <BrandMark />
                    <h1 className="brand-title">증액저축 계산기</h1>
                </div>
                <PlanTabs plans={plans} activeId={active.id} onSelect={select} onAdd={add} />
            </header>
            {/* key: 탭을 바꾸면 입력 커서·삭제 확인 같은 화면 상태를 초기화한다. */}
            <main className="app-main" key={active.id}>
                <PlanForm plan={active} today={today} onChange={patch => update(active.id, patch)} />
                <DeletePlan disabled={plans.length <= 1} onDelete={() => remove(active.id)} />
            </main>
        </div>
    )
}

function BrandMark() {
    return (
        <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="13" width="4.5" height="8" rx="1.5" />
            <rect x="9.75" y="9" width="4.5" height="12" rx="1.5" />
            <rect x="16.5" y="4" width="4.5" height="17" rx="1.5" />
        </svg>
    )
}
