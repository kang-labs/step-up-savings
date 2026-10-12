// 화면 표기용 함수 — 금액 콤마, 한글 단위, 날짜.
import type { YMD } from './savings.ts'

/** 1조 미만으로 막아 계산 정밀도와 화면 폭을 지킨다. */
export const MAX_MONEY = 999_999_999_999

const wonFormat = new Intl.NumberFormat('ko-KR')
const compactFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 })

/** 72495091 → '72,495,091' */
export function formatWon(n: number): string {
    return wonFormat.format(n)
}

/** 입력 문자열에서 숫자만 남겨 금액으로 바꾼다. 빈 값은 0. */
export function parseMoney(text: string): number {
    const digits = text.replace(/\D/g, '')
    return digits === '' ? 0 : Math.min(Number(digits), MAX_MONEY)
}

/** 100000000 → '1억', 72495091 → '7,249만', 130000000 → '1억 3,000만' (만 원 아래는 버림) */
export function koreanUnit(n: number): string {
    if (n < 10_000) return formatWon(n)
    const eok = Math.floor(n / 100_000_000)
    const man = Math.floor((n % 100_000_000) / 10_000)
    const parts = [eok > 0 ? `${formatWon(eok)}억` : '', man > 0 ? `${formatWon(man)}만` : '']
    return parts.filter(part => part !== '').join(' ')
}

/** 금액 입력칸 아래 힌트. 만 원 미만은 표시하지 않는다. */
export function moneyHint(n: number): string {
    if (n < 10_000) return ''
    return `${n % 10_000 === 0 ? '' : '약 '}${koreanUnit(n)} 원`
}

/** 차트 라벨용 짧은 금액: 1315315 → '131.5만', 250000000 → '2.5억' */
export function compactWon(n: number): string {
    if (n >= 100_000_000) return `${compactFormat.format(n / 100_000_000)}억`
    if (n >= 10_000) return `${compactFormat.format(n / 10_000)}만`
    return formatWon(n)
}

/** 로컬 달력 기준 오늘 → '2026-10-12' */
export function todayISO(now: Date = new Date()): string {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** { y: 2026, m: 10, d: 21 } → '2026.10.21' */
export function formatYMD(p: YMD): string {
    return `${p.y}.${pad(p.m)}.${pad(p.d)}`
}

/** 콤마가 섞인 문자열에서 앞에서 digits 번째 숫자 바로 뒤의 커서 위치. */
export function caretAfterDigits(text: string, digits: number): number {
    let seen = 0
    for (let i = 0; i < text.length; i++) {
        if (seen === digits) return i
        if (/\d/.test(text[i])) seen += 1
    }
    return text.length
}

function pad(n: number): string {
    return String(n).padStart(2, '0')
}
