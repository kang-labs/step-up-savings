// 막대가 많아 한 칸(slot, px)이 좁아지면 라벨이 겹치지 않도록 일부만 보여준다.

export type ChartLabels = { value: boolean[]; year: boolean[]; months: boolean }

const VALUE_WIDTH = 46 // '1,234.5만' 정도가 들어가는 폭
const YEAR_WIDTH = 34 // '2026'
const MONTHS_WIDTH = 40 // '12개월'

export function chartLabels(count: number, slot: number): ChartLabels {
    const yearEvery = Math.max(1, Math.ceil(YEAR_WIDTH / slot))
    return {
        // 칸이 좁으면 첫해와 마지막 해 금액만 보여준다.
        value: Array.from({ length: count }, (_, i) => slot >= VALUE_WIDTH || i === 0 || i === count - 1),
        year: Array.from({ length: count }, (_, i) => i % yearEvery === 0),
        months: slot >= MONTHS_WIDTH,
    }
}

const LABEL_GAP = 8 // 막대 꼭대기와 금액 글자 기준선 사이
const LABEL_ASCENT = 10 // 11px 글자가 기준선 위로 차지하는 높이(여유 포함)
const LABEL_DESCENT = 4

/** 막대 위 금액 라벨의 기준선 y. 균등 점선이 글자를 지나가면 점선 바로 위로 올린다. */
export function valueLabelY(barTop: number, flatY: number): number {
    const above = barTop - LABEL_GAP
    const crosses = flatY > above - LABEL_ASCENT && flatY < above + LABEL_DESCENT
    return crosses ? flatY - 6 : above
}
