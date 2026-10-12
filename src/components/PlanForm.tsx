import { useId } from 'react'
import { planLabel, type Plan, type PlanPatch } from '../lib/plans.ts'
import { MoneyInput } from './MoneyInput.tsx'

type Props = { plan: Plan; today: string; onChange: (patch: PlanPatch) => void }

const PAYDAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function PlanForm({ plan, today, onChange }: Props) {
    const id = useId()

    return (
        <section className="card form-card" aria-label="플랜 입력">
            <input
                className="plan-name"
                value={plan.name}
                placeholder={planLabel({ ...plan, name: '' })}
                aria-label="플랜 이름"
                maxLength={20}
                onChange={e => onChange({ name: e.target.value })}
            />
            <div className="form-grid">
                <MoneyInput label="목표금액" value={plan.goal} onChange={goal => onChange({ goal })} />
                <MoneyInput label="현재자산" value={plan.asset} onChange={asset => onChange({ asset })} />

                <div className="field">
                    <div className="field-head">
                        <label className="field-label" htmlFor={`${id}-current`}>
                            현재날짜
                        </label>
                        {plan.currentDate === null ? (
                            <span className="badge">오늘</span>
                        ) : (
                            <button type="button" className="link-btn" onClick={() => onChange({ currentDate: null })}>
                                오늘로
                            </button>
                        )}
                    </div>
                    <div className="field-control">
                        <input
                            id={`${id}-current`}
                            type="date"
                            value={plan.currentDate ?? today}
                            onChange={e => onChange({ currentDate: e.target.value === today ? null : e.target.value })}
                        />
                    </div>
                </div>

                <div className="field">
                    <div className="field-head">
                        <label className="field-label" htmlFor={`${id}-end`}>
                            완료날짜
                        </label>
                    </div>
                    <div className="field-control">
                        <input id={`${id}-end`} type="date" value={plan.endDate} onChange={e => onChange({ endDate: e.target.value })} />
                    </div>
                </div>

                <div className="field">
                    <div className="field-head">
                        <label className="field-label" htmlFor={`${id}-payday`}>
                            월급날
                        </label>
                    </div>
                    <div className="field-control select">
                        <span className="field-affix">매월</span>
                        <select id={`${id}-payday`} value={plan.payday} onChange={e => onChange({ payday: Number(e.target.value) })}>
                            {PAYDAYS.map(d => (
                                <option key={d} value={d}>
                                    {d}일
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <MoneyInput label="연간 증액액" value={plan.stepUp} onChange={stepUp => onChange({ stepUp })} />
            </div>
        </section>
    )
}
