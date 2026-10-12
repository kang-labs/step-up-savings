import logoUrl from './assets/logo.svg'
import { DeletePlan } from './components/DeletePlan.tsx'
import { PlanForm } from './components/PlanForm.tsx'
import { PlanTabs } from './components/PlanTabs.tsx'
import { ResultCards } from './components/ResultCards.tsx'
import { SummaryBar } from './components/SummaryBar.tsx'
import { YearlyChart } from './components/YearlyChart.tsx'
import { usePlans } from './hooks/usePlans.ts'
import { useToday } from './hooks/useToday.ts'
import { calcPlan } from './lib/savings.ts'

export default function App() {
    const { plans, active, select, add, update, remove } = usePlans()
    const today = useToday()
    const result = calcPlan({ ...active, currentDate: active.currentDate ?? today })

    return (
        <div className="app">
            <header className="app-header">
                <div className="brand">
                    <img className="brand-mark" src={logoUrl} alt="" />
                    <h1 className="brand-title">증액저축 계산기</h1>
                </div>
                <PlanTabs plans={plans} activeId={active.id} onSelect={select} onAdd={add} />
            </header>
            {/* key: 탭을 바꾸면 입력 커서·삭제 확인 같은 화면 상태를 초기화한다. */}
            {/* 폭 600px 이상이면 왼쪽 입력·요약, 오른쪽 결과·차트 2열. 좁으면 .col 상자가 사라져 한 줄로 쌓인다. */}
            <main className="app-main" key={active.id}>
                <div className="col col-input">
                    <PlanForm plan={active} today={today} onChange={patch => update(active.id, patch)} />
                    <SummaryBar plan={active} result={result} />
                    <DeletePlan disabled={plans.length <= 1} onDelete={() => remove(active.id)} />
                </div>
                <div className="col col-result">
                    <ResultCards result={result} stepUp={active.stepUp} />
                    {result.status === 'ok' && result.stepUp.ok && <YearlyChart rows={result.stepUp.rows} flatMonthly={result.flatMonthly} />}
                </div>
            </main>
        </div>
    )
}
