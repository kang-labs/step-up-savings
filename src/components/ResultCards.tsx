import { formatWon } from '../lib/format.ts'
import type { PlanResult, YearRow } from '../lib/savings.ts'

type Props = { result: PlanResult; stepUp: number }

const NOTICES: Record<Exclude<PlanResult['status'], 'ok'>, { icon: string; title: string; body: string }> = {
    invalid: { icon: '📅', title: '날짜를 확인해주세요', body: '현재날짜와 완료날짜를 모두 입력해야 계산할 수 있어요.' },
    achieved: { icon: '🎉', title: '이미 목표를 달성했어요', body: '현재자산이 목표금액 이상이에요.' },
    noMonths: { icon: '⏳', title: '남은 월급날이 없어요', body: '완료날짜까지 받을 월급이 없어요. 완료날짜를 늦춰보세요.' },
}

export function ResultCards({ result, stepUp }: Props) {
    if (result.status !== 'ok') {
        const notice = NOTICES[result.status]
        return (
            <section className="card notice" role="status">
                <span className="notice-icon" aria-hidden="true">
                    {notice.icon}
                </span>
                <div>
                    <strong className="notice-title">{notice.title}</strong>
                    <p className="notice-body">{notice.body}</p>
                </div>
            </section>
        )
    }

    return (
        <>
            <section className="card result" aria-label="균등 저축">
                <p className="result-kicker">
                    <span className="step-no">1</span>매달 같은 금액으로
                </p>
                <p className="result-amount">
                    {formatWon(result.flatMonthly)}
                    <span className="unit">원</span>
                </p>
                <p className="result-sub">
                    {result.months}개월 동안 매달 · 총 {formatWon(result.flatMonthly * result.months)}원
                </p>
            </section>
            <section className="card result result-step" aria-label="증액 저축">
                <p className="result-kicker">
                    <span className="step-no">2</span>매년 {formatWon(stepUp)}원씩 늘려서
                </p>
                {result.stepUp.ok ? (
                    <StepUpTable rows={result.stepUp.rows} total={result.stepUp.total} />
                ) : (
                    <p className="inline-notice">연간 증액액이 너무 커서 첫해 월 저축액이 0원 이하가 돼요. 증액액을 줄여보세요.</p>
                )}
            </section>
        </>
    )
}

function StepUpTable({ rows, total }: { rows: YearRow[]; total: number }) {
    return (
        <>
            <p className="result-amount">
                {formatWon(rows[0].monthly)}
                <span className="unit">원</span>
                <span className="result-from">부터</span>
            </p>
            <table className="year-table">
                <thead>
                    <tr>
                        <th scope="col">연도</th>
                        <th scope="col">개월</th>
                        <th scope="col">월 저축액</th>
                        <th scope="col">연간 합계</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={r.year} className={i === 0 ? 'is-first' : undefined}>
                            <td>
                                {r.year}
                                {i === 0 && <span className="tag">첫해</span>}
                            </td>
                            <td>{r.months}</td>
                            <td className="monthly">{formatWon(r.monthly)}</td>
                            <td>{formatWon(r.yearTotal)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3}>총 저축액</td>
                        <td>{formatWon(total)}</td>
                    </tr>
                </tfoot>
            </table>
        </>
    )
}
