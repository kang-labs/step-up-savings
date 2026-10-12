import { formatWon, formatYMD, koreanUnit } from '../lib/format.ts'
import type { Plan } from '../lib/plans.ts'
import type { PlanResult } from '../lib/savings.ts'

type Props = { plan: Plan; result: PlanResult }

export function SummaryBar({ plan, result }: Props) {
    const ratio = plan.goal > 0 ? Math.min(plan.asset / plan.goal, 1) : 1
    const percent = Math.floor(ratio * 100)
    const diff = Math.max(plan.goal - plan.asset, 0)
    const months = result.status === 'ok' ? `${result.months}개월` : result.status === 'noMonths' ? '0개월' : '–'
    const next = result.status === 'ok' ? formatYMD(result.nextPayday) : '–'

    return (
        <section className="card summary" aria-label="요약">
            <div className="progress-head">
                <span className="progress-caption">
                    현재 {koreanUnit(plan.asset)} 원 / 목표 {koreanUnit(plan.goal)} 원
                </span>
                <strong className="progress-pct">{percent}%</strong>
            </div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                <div className="progress-fill" style={{ width: `${ratio * 100}%` }} />
            </div>
            <dl className="stats">
                <div className="stat">
                    <dt>차액</dt>
                    <dd>
                        {formatWon(diff)}
                        <small>원</small>
                    </dd>
                </div>
                <div className="stat">
                    <dt>남은 개월</dt>
                    <dd>{months}</dd>
                </div>
                <div className="stat">
                    <dt>다음 월급날</dt>
                    <dd>{next}</dd>
                </div>
            </dl>
        </section>
    )
}
