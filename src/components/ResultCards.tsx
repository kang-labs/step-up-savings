import { formatPercent, formatWon, koreanUnit } from '../lib/format.ts'
import type { PlanResult, YearRow } from '../lib/savings.ts'

/** returnBp: 계산에 쓴 연수익률(꺼져 있으면 0). 0 보다 크면 넣는 돈과 예상 수익을 나눠 보여 준다. */
type Props = { result: PlanResult; stepUp: number; returnBp: number }

type Notice = { icon: string; title: string; body: string }

function noticeOf(result: Exclude<PlanResult, { status: 'ok' }>, returnBp: number): Notice {
    switch (result.status) {
        case 'invalid':
            return { icon: '📅', title: '날짜를 확인해주세요', body: '현재날짜와 완료날짜를 모두 입력해야 계산할 수 있어요.' }
        case 'achieved':
            return { icon: '🎉', title: '이미 목표를 달성했어요', body: '현재자산이 목표금액 이상이에요.' }
        case 'noMonths':
            return { icon: '⏳', title: '남은 월급날이 없어요', body: '완료날짜까지 받을 월급이 없어요. 완료날짜를 늦춰보세요.' }
        case 'grown':
            return {
                icon: '📈',
                title: '지금 자산만 굴려도 목표에 닿아요',
                body: `연 ${formatPercent(returnBp)}% 수익이면 완료날짜에 약 ${koreanUnit(result.finalAsset)} 원이 돼요.`,
            }
    }
}

export function ResultCards({ result, stepUp, returnBp }: Props) {
    if (result.status !== 'ok') {
        const notice = noticeOf(result, returnBp)
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

    const withReturn = returnBp > 0
    const returnBadge = withReturn && <span className="badge result-badge">연 {formatPercent(returnBp)}% 수익</span>
    const flatDeposit = result.flatMonthly * result.months

    return (
        <>
            <section className="card result" aria-label="균등 저축">
                <p className="result-kicker">
                    <span className="step-no">1</span>매달 같은 금액으로
                    {returnBadge}
                </p>
                <p className="result-amount">
                    {formatWon(result.flatMonthly)}
                    <span className="unit">원</span>
                </p>
                <p className="result-sub">
                    {result.months}개월 동안 매달 ·{' '}
                    {withReturn
                        ? `넣는 돈 ${formatWon(flatDeposit)}원 · 예상 수익 ${formatWon(result.flatProfit)}원`
                        : `총 ${formatWon(flatDeposit)}원`}
                </p>
            </section>
            <section className="card result result-step" aria-label="증액 저축">
                <p className="result-kicker">
                    <span className="step-no">2</span>매년 {formatWon(stepUp)}원씩 늘려서
                    {returnBadge}
                </p>
                {result.stepUp.ok ? (
                    <StepUpTable rows={result.stepUp.rows} total={result.stepUp.total} profit={withReturn ? result.stepUp.profit : null} />
                ) : (
                    <p className="inline-notice">연간 증액액이 너무 커서 첫해 월 저축액이 0원 이하가 돼요. 증액액을 줄여보세요.</p>
                )}
            </section>
        </>
    )
}

/** profit: 예상 수익. null 이면 수익 없이 계산한 것이라 '총 저축액' 한 줄만. */
function StepUpTable({ rows, total, profit }: { rows: YearRow[]; total: number; profit: number | null }) {
    return (
        <>
            <p className="result-amount">
                {formatWon(rows[0].monthly)}
                <span className="unit">원</span>
                <span className="result-from">부터</span>
            </p>
            {/* 표가 카드보다 넓어지면(아주 큰 금액·좁은 화면) 표만 가로로 스크롤 */}
            <div className="table-scroll">
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
                        {profit === null ? (
                            <tr>
                                <td colSpan={3}>총 저축액</td>
                                <td>{formatWon(total)}</td>
                            </tr>
                        ) : (
                            <>
                                <tr>
                                    <td colSpan={3}>넣는 돈 합계</td>
                                    <td>{formatWon(total)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3}>예상 수익</td>
                                    <td>{formatWon(profit)}</td>
                                </tr>
                            </>
                        )}
                    </tfoot>
                </table>
            </div>
        </>
    )
}
