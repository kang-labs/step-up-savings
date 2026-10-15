// 화면 표기용 함수 — 금액 콤마, 한글 단위, 날짜.
import type { YMD } from './savings.ts'

/** 1조 미만으로 막아 계산 정밀도와 화면 폭을 지킨다. */
export const MAX_MONEY = 999_999_999_999

const wonFormat = new Intl.NumberFormat('ko-KR')
const compactFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 })

/** 연수익률 상한 30% (× 100 정수) */
export const MAX_RETURN_BP = 3_000

/**
 * 수익률 입력칸 글자 거르기: 숫자와 소수점 하나만, 소수 둘째 자리까지, 30 이하.
 * 받아들일 수 없는 입력이면 null (입력칸은 이전 글자를 유지한다).
 */
export function cleanPercentInput(text: string): string | null {
    const cleaned = text.replace(/[^\d.]/g, '').replace(/^0+(?=\d)/, '')
    if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return null
    return percentToBp(cleaned) > MAX_RETURN_BP ? null : cleaned
}

/** '3.25' → 325. 빈 값이나 '.' 은 0. */
export function percentToBp(text: string): number {
    const value = Number(text)
    return text === '' || text === '.' || Number.isNaN(value) ? 0 : Math.round(value * 100)
}

/** 325 → '3.25', 350 → '3.5', 500 → '5' */
export function formatPercent(bp: number): string {
    return String(bp / 100)
}

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

/** 지금부터 다음 날 0시(로컬)까지 남은 밀리초 — '오늘' 을 자정에 다시 읽는 데 쓴다. */
export function msUntilNextDay(now: Date): number {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return next.getTime() - now.getTime()
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
