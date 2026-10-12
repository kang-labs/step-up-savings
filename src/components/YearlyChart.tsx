import { chartLabels, valueLabelY } from '../lib/chart.ts'
import { compactWon, formatWon } from '../lib/format.ts'
import type { YearRow } from '../lib/savings.ts'

type Props = { rows: YearRow[]; flatMonthly: number }

const W = 400
const H = 220
const PAD = { top: 30, right: 16, bottom: 44, left: 16 }

/** 연도별 증액 월 저축액(막대)과 균등 월 저축액(점선) 비교. 막대는 0원에서 시작한다. */
export function YearlyChart({ rows, flatMonthly }: Props) {
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const baseY = PAD.top + innerH
    const slot = innerW / rows.length
    const barW = Math.min(40, slot * 0.6)
    const max = Math.max(flatMonthly, ...rows.map(r => r.monthly)) * 1.1
    const y = (v: number) => PAD.top + innerH * (1 - v / max)
    const cx = (i: number) => PAD.left + slot * (i + 0.5)
    const labels = chartLabels(rows.length, slot)
    const flatY = y(flatMonthly)

    return (
        <section className="card chart-card">
            <div className="chart-head">
                <h2 className="card-title">연도별 월 저축액</h2>
                <div className="legend">
                    <span className="legend-item">
                        <i className="swatch swatch-bar" />
                        증액
                    </span>
                    <span className="legend-item">
                        <i className="swatch swatch-line" />
                        균등 {compactWon(flatMonthly)}
                    </span>
                </div>
            </div>
            <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="연도별 증액 월 저축액과 균등 월 저축액 비교">
                {rows.map((r, i) => (
                    <g key={r.year} className="chart-col">
                        <path
                            className={i === 0 ? 'chart-bar is-first' : 'chart-bar'}
                            d={barPath(cx(i) - barW / 2, y(r.monthly), barW, baseY - y(r.monthly), 4)}
                        />
                        {/* 라벨을 솎아낸 해도 마우스를 올리면 금액을 볼 수 있게 칸 전체를 반응 영역으로 둔다. */}
                        <rect className="chart-hit" x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH}>
                            <title>{`${r.year}년 · 월 ${formatWon(r.monthly)}원 · ${r.months}개월`}</title>
                        </rect>
                    </g>
                ))}
                <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={baseY} y2={baseY} />
                <line className="chart-flat" x1={PAD.left} x2={W - PAD.right} y1={flatY} y2={flatY} />
                {rows.map((r, i) => (
                    <g key={r.year} className="chart-labels">
                        {labels.value[i] && (
                            <text className="chart-value" x={cx(i)} y={valueLabelY(y(r.monthly), flatY)} textAnchor="middle">
                                {compactWon(r.monthly)}
                            </text>
                        )}
                        {labels.year[i] && (
                            <text className="chart-year" x={cx(i)} y={baseY + 18} textAnchor="middle">
                                {r.year}
                            </text>
                        )}
                        {labels.months && (
                            <text className="chart-months" x={cx(i)} y={baseY + 33} textAnchor="middle">
                                {r.months}개월
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </section>
    )
}

/** 위쪽 모서리만 둥근 막대 */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
    const rr = Math.min(r, w / 2, h)
    return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}
