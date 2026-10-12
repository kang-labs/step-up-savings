# 증액저축 계산기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 목표금액·현재자산·날짜·월급날로 균등/증액 월 저축액을 계산하는 React 앱을 만들고, `npm run build` 한 번으로 `release/증액저축계산기.exe`(Electron portable)를 갱신한다.

**Architecture:** 계산(`lib/savings.ts`), 표기(`lib/format.ts`), 플랜 상태 전이(`lib/plans.ts`), 차트 라벨(`lib/chart.ts`)은 React 와 무관한 순수 함수로 두고 Vitest 로 검증한다. React 컴포넌트는 이 함수들을 화면에 연결만 한다. Electron 메인 프로세스는 `dist/index.html` 을 작은 창에 띄우는 것만 하며, electron-builder 가 이를 단일 portable exe 로 묶는다.

**Tech Stack:** React 19 · TypeScript 6.0 · Vite 8 · Vitest 5 · Electron 44 · electron-builder 26 · Pretendard

**Spec:** `docs/superpowers/specs/2026-10-12-step-up-savings-design.md`

**Project root:** `C:\Users\PIX-BIBLE\Desktop\bible\찡\01.project` — 모든 경로와 명령은 이 폴더 기준이다.

## Global Constraints

- 코드 스타일: 들여쓰기 4칸, 세미콜론 없음, 작은따옴표, 주석은 한국어(사용자의 기존 React 프로젝트와 동일).
- 모든 npm 패키지는 `devDependencies` 로 설치한다 — Vite 가 번들하므로 exe 에 node_modules 가 들어가지 않게 하기 위함.
- 버전: react ^19.3 · vite ^8.3 · @vitejs/plugin-react ^6.1 · typescript ~6.0 · vitest ^5.0 · electron ^44.7 · electron-builder ^26.15 · pretendard ^1.3.9.
- 금액은 원 단위 정수. **모든 월 저축액은 `Math.ceil` (1원 단위 올림).**
- 날짜는 `'YYYY-MM-DD'` 문자열로 저장하고 `{y, m, d}` 정수로만 비교한다. 비교에 `Date` 를 쓰지 않는다.
- 남은 개월 수 포함 조건: `현재날짜 < 그 달 월급날 ≤ 완료날짜`, 없는 날(31일 등)은 그 달 말일.
- 기본값: 목표 100,000,000 · 완료 `'2029-12-31'` · 월급날 21 · 연간 증액액 100,000 · 현재자산 0 · 현재날짜 `null`(= 오늘).
- localStorage 키: `'step-up-savings/v1'`.
- 창: 460×820(작업 영역보다 크면 맞춤), 최소 400×640, 메뉴바 없음, 제목 `증액저축 계산기`.
- 산출물: `release/증액저축계산기.exe` — `npm run build` 마다 덮어씀.
- UI 문구는 한국어, 라이트 테마만.
- git 커밋 메시지에 `Co-Authored-By` 줄을 넣지 않는다(사용자 선호).

## Review Focus

스펙이 직접 말하지 않지만 실사용에서 가장 먼저 부딪힐 입력/상황과, 이를 고정하는 테스트가 들어간 태스크:

1. **금액 칸을 비우거나 `26,117,974원` 을 붙여넣거나 숫자를 끝없이 입력** → 빈 값은 0, 숫자만 추출, 999,999,999,999 상한. (Task 3 `parseMoney` 테스트)
2. **콤마가 찍힌 숫자 중간을 고칠 때** → 커서가 끝으로 튀지 않고 같은 숫자 뒤에 머문다. (Task 3 `caretAfterDigits` 테스트)
3. **깨졌거나 일부 필드가 빠진 localStorage** → 앱이 죽지 않고, 멀쩡한 플랜만 살리거나 기본 플랜으로 시작. (Task 4 `parseState` 테스트)
4. **보고 있던 플랜 삭제 / 마지막 남은 플랜 삭제 시도** → 옆 플랜으로 이동, 마지막 하나는 남는다. (Task 4 `removePlan` 테스트)
5. **완료날짜가 먼 미래(연도 10개 이상)** → 차트 라벨이 서로 겹치지 않게 솎아낸다. (Task 6 `chartLabels` 테스트)

---

### Task 1: 프로젝트 골격 + 남은 개월 수 계산

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`
- Create: `src/lib/savings.ts`
- Test: `src/lib/savings.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces (`src/lib/savings.ts`):
  - `type YMD = { y: number; m: number; d: number }`
  - `type YearMonths = { year: number; months: number }`
  - `parseYMD(s: string): YMD | null`
  - `daysInMonth(y: number, m: number): number`
  - `listPaydays(current: YMD, end: YMD, payday: number): YMD[]`
  - `groupByYear(paydays: YMD[]): YearMonths[]`

- [ ] **Step 1: package.json 작성**

```json
{
    "name": "step-up-savings",
    "productName": "증액저축계산기",
    "description": "증액저축 계산기",
    "author": "Bible Kang",
    "private": true,
    "version": "0.1.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "test": "vitest run",
        "build": "tsc -b && vite build"
    }
}
```

- [ ] **Step 2: 의존성 설치**

Run:
```bash
npm install -D react@^19.3.0 react-dom@^19.3.0 @types/react@^19.3.0 @types/react-dom@^19.3.0 vite@^8.3.4 @vitejs/plugin-react@^6.1.2 typescript@~6.0.3 vitest@^5.0.3 @types/node@^24 pretendard@^1.3.9
```
Expected: `added N packages`, `package-lock.json` 생성, `package.json` 에 `devDependencies` 만 생김(`dependencies` 없음).

- [ ] **Step 3: TypeScript · Vite 설정 작성**

`tsconfig.json`:
```json
{
    "files": [],
    "references": [
        { "path": "./tsconfig.app.json" },
        { "path": "./tsconfig.node.json" }
    ]
}
```

`tsconfig.app.json`:
```json
{
    "compilerOptions": {
        "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
        "target": "es2023",
        "lib": ["ES2023", "DOM"],
        "module": "esnext",
        "types": ["vite/client"],
        "allowArbitraryExtensions": true,
        "skipLibCheck": true,

        /* Bundler mode */
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "verbatimModuleSyntax": true,
        "moduleDetection": "force",
        "noEmit": true,
        "jsx": "react-jsx",

        /* Linting */
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "erasableSyntaxOnly": true,
        "noFallthroughCasesInSwitch": true
    },
    "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
    "compilerOptions": {
        "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
        "target": "es2023",
        "lib": ["ES2023"],
        "types": ["node"],
        "skipLibCheck": true,

        /* Bundler mode */
        "module": "nodenext",
        "allowImportingTsExtensions": true,
        "verbatimModuleSyntax": true,
        "moduleDetection": "force",
        "noEmit": true,

        /* Linting */
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "erasableSyntaxOnly": true,
        "noFallthroughCasesInSwitch": true
    },
    "include": ["vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [react()],
    // Electron 이 file:// 로 dist/index.html 을 열기 때문에 assets 를 상대 경로로 빌드한다.
    base: './',
    test: {
        include: ['src/**/*.test.ts'],
    },
})
```

- [ ] **Step 4: 실패하는 테스트 작성** — `src/lib/savings.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { groupByYear, listPaydays, parseYMD } from './savings.ts'

const ymd = (s: string) => parseYMD(s)!

function months(current: string, end: string, payday = 21) {
    return listPaydays(ymd(current), ymd(end), payday).length
}

describe('parseYMD', () => {
    it('parses a valid date', () => {
        expect(parseYMD('2026-04-21')).toEqual({ y: 2026, m: 4, d: 21 })
    })

    it('rejects empty, malformed and impossible dates', () => {
        expect(parseYMD('')).toBeNull()
        expect(parseYMD('2026-4-21')).toBeNull()
        expect(parseYMD('2026-02-30')).toBeNull()
        expect(parseYMD('2026-13-01')).toBeNull()
    })

    it('accepts Feb 29 only in leap years', () => {
        expect(parseYMD('2028-02-29')).not.toBeNull()
        expect(parseYMD('2027-02-29')).toBeNull()
    })
})

describe('listPaydays — 남은 개월 수', () => {
    it('counts the current month when entered before payday', () => {
        expect(months('2025-11-13', '2029-12-31')).toBe(50)
        expect(months('2026-01-05', '2029-12-31')).toBe(48)
        expect(months('2026-04-20', '2029-12-31')).toBe(45)
    })

    it('excludes the current month from payday itself onward', () => {
        expect(months('2026-04-21', '2029-12-31')).toBe(44)
        expect(months('2026-04-22', '2029-12-31')).toBe(44)
    })

    it('counts the completion month only when its payday is on or before the end date', () => {
        expect(months('2026-10-12', '2029-08-30')).toBe(35)
        expect(months('2026-10-12', '2029-08-21')).toBe(35)
        expect(months('2026-10-12', '2029-08-20')).toBe(34)
    })

    it('uses the last day of the month when payday does not exist in that month', () => {
        expect(listPaydays(ymd('2027-01-31'), ymd('2027-03-31'), 31)).toEqual([
            { y: 2027, m: 2, d: 28 },
            { y: 2027, m: 3, d: 31 },
        ])
        expect(listPaydays(ymd('2028-01-31'), ymd('2028-02-29'), 31)).toEqual([{ y: 2028, m: 2, d: 29 }])
    })

    it('returns nothing when no payday falls in the range', () => {
        expect(months('2026-10-22', '2026-11-20')).toBe(0)
        expect(months('2026-10-12', '2026-01-01')).toBe(0)
    })
})

describe('groupByYear', () => {
    it('groups paydays by calendar year in order', () => {
        const rows = groupByYear(listPaydays(ymd('2026-10-12'), ymd('2029-08-20'), 21))
        expect(rows).toEqual([
            { year: 2026, months: 3 },
            { year: 2027, months: 12 },
            { year: 2028, months: 12 },
            { year: 2029, months: 7 },
        ])
    })

    it('returns an empty list for no paydays', () => {
        expect(groupByYear([])).toEqual([])
    })
})
```

- [ ] **Step 5: 실패 확인**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./savings.ts"` (또는 "Cannot find module").

- [ ] **Step 6: 구현** — `src/lib/savings.ts`

```ts
// 증액저축 계산 — 화면과 무관한 순수 함수만 둔다.
// 날짜는 'YYYY-MM-DD' 문자열을 {y, m, d} 정수로 바꿔 비교한다(시간대 영향 없음).

export type YMD = { y: number; m: number; d: number }

export type YearMonths = { year: number; months: number }

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(y: number, m: number): number {
    return m === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[m - 1]
}

/** 'YYYY-MM-DD' → {y, m, d}. 형식이 틀리거나 없는 날짜면 null. */
export function parseYMD(s: string): YMD | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (match === null) return null
    const y = Number(match[1])
    const m = Number(match[2])
    const d = Number(match[3])
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
    return { y, m, d }
}

function toKey(p: YMD): number {
    return p.y * 10_000 + p.m * 100 + p.d
}

/**
 * 현재날짜 < 월급날 ≤ 완료날짜 인 월급날 목록.
 * 월급날 당일부터는 이미 받은 것으로 보고, 그 달에 없는 날(31일 등)은 말일로 본다.
 */
export function listPaydays(current: YMD, end: YMD, payday: number): YMD[] {
    const result: YMD[] = []
    const from = toKey(current)
    const to = toKey(end)
    let y = current.y
    let m = current.m
    while (y < end.y || (y === end.y && m <= end.m)) {
        const day: YMD = { y, m, d: Math.min(payday, daysInMonth(y, m)) }
        const key = toKey(day)
        if (key > from && key <= to) result.push(day)
        m += 1
        if (m > 12) {
            y += 1
            m = 1
        }
    }
    return result
}

/** 월급날 목록을 연도별 개월 수로 묶는다. */
export function groupByYear(paydays: YMD[]): YearMonths[] {
    const rows: YearMonths[] = []
    for (const p of paydays) {
        const last = rows.at(-1)
        if (last !== undefined && last.year === p.y) last.months += 1
        else rows.push({ year: p.y, months: 1 })
    }
    return rows
}
```

- [ ] **Step 7: 통과 확인**

Run: `npm test`
Expected: PASS — `savings.test.ts` 전부 통과.

Run: `npx tsc -b`
Expected: 출력 없이 종료(오류 0).

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts src/lib/savings.ts src/lib/savings.test.ts
git commit -m "feat: scaffold project and count remaining paydays"
```

---

### Task 2: 균등 · 증액 월 저축액 계산 (`calcPlan`)

**Files:**
- Modify: `src/lib/savings.ts` (파일 끝에 추가)
- Test: `src/lib/savings.test.ts` (import 줄 교체 + 파일 끝에 추가)

**Interfaces:**
- Consumes: Task 1 의 `YMD`, `YearMonths`, `parseYMD`, `listPaydays`, `groupByYear`
- Produces (`src/lib/savings.ts`):
  - `type PlanInput = { goal: number; asset: number; currentDate: string; endDate: string; payday: number; stepUp: number }`
  - `type YearRow = { year: number; months: number; monthly: number; yearTotal: number }`
  - `type StepUpResult = { ok: true; rows: YearRow[]; total: number } | { ok: false }`
  - `type PlanResult = { status: 'invalid' } | { status: 'achieved'; diff: number } | { status: 'noMonths'; diff: number } | { status: 'ok'; diff: number; months: number; nextPayday: YMD; flatMonthly: number; stepUp: StepUpResult }`
  - `calcStepUp(diff: number, byYear: YearMonths[], stepUp: number): StepUpResult`
  - `calcPlan(input: PlanInput): PlanResult`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/savings.test.ts` 의 두 번째 줄(import)을 다음으로 교체:
```ts
import { calcPlan, groupByYear, listPaydays, parseYMD, type PlanInput, type PlanResult } from './savings.ts'
```

파일 끝에 추가:
```ts
const base: PlanInput = {
    goal: 100_000_000,
    asset: 0,
    currentDate: '2026-01-05',
    endDate: '2029-12-31',
    payday: 21,
    stepUp: 100_000,
}

function okResult(r: PlanResult) {
    if (r.status !== 'ok') throw new Error(`expected ok, got ${JSON.stringify(r)}`)
    return r
}

function stepRows(r: PlanResult) {
    const ok = okResult(r)
    if (!ok.stepUp.ok) throw new Error('expected a step-up schedule')
    return ok.stepUp.rows.map(row => [row.year, row.months, row.monthly])
}

describe('calcPlan — 엑셀 대조값', () => {
    it('2026-01-05, 자산 27,504,909, 13만원 증액', () => {
        const r = calcPlan({ ...base, currentDate: '2026-01-05', asset: 27_504_909, stepUp: 130_000 })
        expect(okResult(r)).toMatchObject({ diff: 72_495_091, months: 48, flatMonthly: 1_510_315 })
        expect(stepRows(r)).toEqual([
            [2026, 12, 1_315_315],
            [2027, 12, 1_445_315],
            [2028, 12, 1_575_315],
            [2029, 12, 1_705_315],
        ])
    })

    it('2026-04-21 (월급날 당일), 자산 33,652,620, 13만원 증액', () => {
        const r = calcPlan({ ...base, currentDate: '2026-04-21', asset: 33_652_620, stepUp: 130_000 })
        expect(okResult(r)).toMatchObject({ diff: 66_347_380, months: 44, flatMonthly: 1_507_895 })
        expect(stepRows(r)).toEqual([
            [2026, 8, 1_295_168],
            [2027, 12, 1_425_168],
            [2028, 12, 1_555_168],
            [2029, 12, 1_685_168],
        ])
    })

    it('2025-11-13 은 2025년이 첫해', () => {
        const r = calcPlan({ ...base, currentDate: '2025-11-13', asset: 26_117_974 })
        expect(okResult(r)).toMatchObject({ diff: 73_882_026, months: 50, flatMonthly: 1_477_641 })
        expect(stepRows(r)).toEqual([
            [2025, 2, 1_237_641],
            [2026, 12, 1_337_641],
            [2027, 12, 1_437_641],
            [2028, 12, 1_537_641],
            [2029, 12, 1_637_641],
        ])
    })
})

describe('calcPlan — 규칙과 경계', () => {
    it('reaches the goal: totals cover the gap by less than one won per month', () => {
        const r = okResult(calcPlan({ ...base, asset: 27_504_909, stepUp: 130_000 }))
        if (!r.stepUp.ok) throw new Error('expected a step-up schedule')
        for (const row of r.stepUp.rows) expect(row.yearTotal).toBe(row.monthly * row.months)
        expect(r.stepUp.total).toBe(r.stepUp.rows.reduce((sum, row) => sum + row.yearTotal, 0))
        expect(r.stepUp.total).toBeGreaterThanOrEqual(r.diff)
        expect(r.stepUp.total - r.diff).toBeLessThan(r.months)
        expect(r.flatMonthly * r.months).toBeGreaterThanOrEqual(r.diff)
    })

    it('starts the first year next year when no payday is left this year', () => {
        const r = calcPlan({ ...base, currentDate: '2026-12-25' })
        expect(okResult(r).months).toBe(36)
        expect(stepRows(r)[0][0]).toBe(2027)
    })

    it('reports the next payday', () => {
        expect(okResult(calcPlan({ ...base, currentDate: '2026-10-12' })).nextPayday).toEqual({ y: 2026, m: 10, d: 21 })
        expect(okResult(calcPlan({ ...base, currentDate: '2026-10-21' })).nextPayday).toEqual({ y: 2026, m: 11, d: 21 })
    })

    it('makes every year equal when the yearly increase is 0', () => {
        const r = calcPlan({ ...base, asset: 27_504_909, stepUp: 0 })
        const flat = okResult(r).flatMonthly
        expect(stepRows(r).map(row => row[2])).toEqual([flat, flat, flat, flat])
    })

    it('flags a yearly increase too large for the gap but still gives the flat amount', () => {
        const r = okResult(calcPlan({ ...base, goal: 1_000_000, stepUp: 1_000_000 }))
        expect(r.flatMonthly).toBe(20_834)
        expect(r.stepUp).toEqual({ ok: false })
    })

    it('reports an already reached goal', () => {
        expect(calcPlan({ ...base, asset: 100_000_000 })).toEqual({ status: 'achieved', diff: 0 })
        expect(calcPlan({ ...base, asset: 120_000_000 })).toEqual({ status: 'achieved', diff: -20_000_000 })
    })

    it('reports no remaining months', () => {
        expect(calcPlan({ ...base, currentDate: '2026-10-22', endDate: '2026-11-20' })).toEqual({ status: 'noMonths', diff: 100_000_000 })
        expect(calcPlan({ ...base, currentDate: '2030-01-01' })).toEqual({ status: 'noMonths', diff: 100_000_000 })
    })

    it('reports invalid dates and paydays', () => {
        expect(calcPlan({ ...base, currentDate: '' })).toEqual({ status: 'invalid' })
        expect(calcPlan({ ...base, endDate: '2029-02-30' })).toEqual({ status: 'invalid' })
        expect(calcPlan({ ...base, payday: 0 })).toEqual({ status: 'invalid' })
        expect(calcPlan({ ...base, payday: 32 })).toEqual({ status: 'invalid' })
    })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `calcPlan is not a function` / `does not provide an export named 'calcPlan'`.

- [ ] **Step 3: 구현** — `src/lib/savings.ts` 끝에 추가

```ts
export type PlanInput = {
    goal: number
    asset: number
    currentDate: string
    endDate: string
    payday: number
    stepUp: number
}

export type YearRow = { year: number; months: number; monthly: number; yearTotal: number }

/** ok: false = 첫해 월 저축액이 0원 이하가 될 만큼 연간 증액액이 크다. */
export type StepUpResult = { ok: true; rows: YearRow[]; total: number } | { ok: false }

export type PlanResult =
    | { status: 'invalid' }
    | { status: 'achieved'; diff: number }
    | { status: 'noMonths'; diff: number }
    | {
          status: 'ok'
          diff: number
          months: number
          nextPayday: YMD
          flatMonthly: number
          stepUp: StepUpResult
      }

/**
 * 첫해(i = 0) 월 x, 다음 해 x + 증액액 … 일 때 Σ 개월수 × 월액 = 차액 이 되는 x 를 구한다.
 * x = ceil((차액 − 증액액 × Σ i·m_i) / Σ m_i)
 */
export function calcStepUp(diff: number, byYear: YearMonths[], stepUp: number): StepUpResult {
    const months = byYear.reduce((sum, r) => sum + r.months, 0)
    const weighted = byYear.reduce((sum, r, i) => sum + i * r.months, 0)
    const first = Math.ceil((diff - stepUp * weighted) / months)
    if (first <= 0) return { ok: false }
    const rows = byYear.map((r, i) => {
        const monthly = first + i * stepUp
        return { year: r.year, months: r.months, monthly, yearTotal: monthly * r.months }
    })
    return { ok: true, rows, total: rows.reduce((sum, r) => sum + r.yearTotal, 0) }
}

export function calcPlan(input: PlanInput): PlanResult {
    const current = parseYMD(input.currentDate)
    const end = parseYMD(input.endDate)
    const paydayValid = Number.isInteger(input.payday) && input.payday >= 1 && input.payday <= 31
    if (current === null || end === null || !paydayValid) return { status: 'invalid' }

    const diff = input.goal - input.asset
    if (diff <= 0) return { status: 'achieved', diff }

    const paydays = listPaydays(current, end, input.payday)
    if (paydays.length === 0) return { status: 'noMonths', diff }

    return {
        status: 'ok',
        diff,
        months: paydays.length,
        nextPayday: paydays[0],
        flatMonthly: Math.ceil(diff / paydays.length),
        stepUp: calcStepUp(diff, groupByYear(paydays), input.stepUp),
    }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — Task 1 테스트 포함 전부 통과.

Run: `npx tsc -b`
Expected: 오류 0.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/savings.ts src/lib/savings.test.ts
git commit -m "feat: calculate flat and step-up monthly savings"
```

---

### Task 3: 금액 · 날짜 표기 (`lib/format.ts`)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: Task 1 의 `type YMD`
- Produces (`src/lib/format.ts`):
  - `MAX_MONEY = 999_999_999_999`
  - `formatWon(n: number): string` — `72495091 → '72,495,091'`
  - `parseMoney(text: string): number`
  - `koreanUnit(n: number): string` — `'1억'`, `'7,249만'`, `'1억 3,000만'`
  - `moneyHint(n: number): string` — `'약 7,249만 원'`, 만 원 미만은 `''`
  - `compactWon(n: number): string` — `'131.5만'`, `'2.5억'`
  - `todayISO(now?: Date): string` — `'2026-10-12'`
  - `formatYMD(p: YMD): string` — `'2026.10.21'`
  - `caretAfterDigits(text: string, digits: number): number`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/format.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { MAX_MONEY, caretAfterDigits, compactWon, formatWon, formatYMD, koreanUnit, moneyHint, parseMoney, todayISO } from './format.ts'

describe('formatWon', () => {
    it('adds thousands separators', () => {
        expect(formatWon(72_495_091)).toBe('72,495,091')
        expect(formatWon(0)).toBe('0')
    })
})

describe('parseMoney', () => {
    it('keeps digits only, so pasted text with commas and 원 works', () => {
        expect(parseMoney('26,117,974원')).toBe(26_117_974)
        expect(parseMoney(' 1 000 ')).toBe(1_000)
    })

    it('treats an empty or digit-less field as 0', () => {
        expect(parseMoney('')).toBe(0)
        expect(parseMoney('원')).toBe(0)
    })

    it('caps absurdly long input', () => {
        expect(parseMoney('9'.repeat(30))).toBe(MAX_MONEY)
    })
})

describe('koreanUnit', () => {
    it('writes amounts in 억 and 만, dropping anything under 만', () => {
        expect(koreanUnit(100_000_000)).toBe('1억')
        expect(koreanUnit(72_495_091)).toBe('7,249만')
        expect(koreanUnit(50_000_000)).toBe('5,000만')
        expect(koreanUnit(130_000_000)).toBe('1억 3,000만')
        expect(koreanUnit(9_999)).toBe('9,999')
        expect(koreanUnit(0)).toBe('0')
    })
})

describe('moneyHint', () => {
    it('says 약 only when it rounds', () => {
        expect(moneyHint(100_000_000)).toBe('1억 원')
        expect(moneyHint(72_495_091)).toBe('약 7,249만 원')
        expect(moneyHint(100_000)).toBe('10만 원')
    })

    it('stays empty under 만 원', () => {
        expect(moneyHint(0)).toBe('')
        expect(moneyHint(9_999)).toBe('')
    })
})

describe('compactWon', () => {
    it('shortens amounts for chart labels', () => {
        expect(compactWon(1_315_315)).toBe('131.5만')
        expect(compactWon(1_510_315)).toBe('151만')
        expect(compactWon(250_000_000)).toBe('2.5억')
        expect(compactWon(9_999)).toBe('9,999')
    })
})

describe('dates', () => {
    it('todayISO uses the local calendar date', () => {
        expect(todayISO(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12')
        expect(todayISO(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05')
    })

    it('formatYMD pads month and day', () => {
        expect(formatYMD({ y: 2026, m: 1, d: 5 })).toBe('2026.01.05')
    })
})

describe('caretAfterDigits', () => {
    it('puts the caret right after the n-th digit, skipping commas', () => {
        expect(caretAfterDigits('1,234,567', 4)).toBe(5)
        expect(caretAfterDigits('15,234', 2)).toBe(2)
        expect(caretAfterDigits('1,234', 0)).toBe(0)
    })

    it('falls back to the end when there are fewer digits', () => {
        expect(caretAfterDigits('1,234', 9)).toBe(5)
        expect(caretAfterDigits('', 3)).toBe(0)
    })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format.ts"`.

- [ ] **Step 3: 구현** — `src/lib/format.ts`

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 전체 통과.

Run: `npx tsc -b`
Expected: 오류 0.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add money and date formatting helpers"
```

---

### Task 4: 플랜 모델 · 상태 전이 · 저장 (`lib/plans.ts`, `hooks/usePlans.ts`)

**Files:**
- Create: `src/lib/plans.ts`
- Create: `src/hooks/usePlans.ts`
- Test: `src/lib/plans.test.ts`

**Interfaces:**
- Consumes: Task 3 의 `koreanUnit`
- Produces (`src/lib/plans.ts`):
  - `type Plan = { id: string; name: string; goal: number; currentDate: string | null; endDate: string; asset: number; payday: number; stepUp: number }`
  - `type PlanPatch = Partial<Omit<Plan, 'id'>>`
  - `type PlansState = { plans: Plan[]; activeId: string }`
  - `STORAGE_KEY = 'step-up-savings/v1'`
  - `createPlan(id: string): Plan`
  - `initialState(newId: () => string): PlansState`
  - `planLabel(plan: Plan): string`
  - `addPlan(state, id): PlansState` · `updatePlan(state, id, patch): PlansState` · `removePlan(state, id): PlansState` · `selectPlan(state, id): PlansState`
  - `parseState(raw: string | null): PlansState | null`
- Produces (`src/hooks/usePlans.ts`):
  - `usePlans(): { plans: Plan[]; active: Plan; select(id: string): void; add(): void; update(id: string, patch: PlanPatch): void; remove(id: string): void }`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/plans.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { addPlan, createPlan, initialState, parseState, planLabel, removePlan, selectPlan, updatePlan, type PlansState } from './plans.ts'

function stateOf(ids: string[], activeId = ids[0]): PlansState {
    return { plans: ids.map(id => createPlan(id)), activeId }
}

describe('createPlan / initialState', () => {
    it('uses the spec defaults', () => {
        expect(createPlan('a')).toEqual({
            id: 'a',
            name: '',
            goal: 100_000_000,
            currentDate: null,
            endDate: '2029-12-31',
            asset: 0,
            payday: 21,
            stepUp: 100_000,
        })
    })

    it('starts with one active default plan', () => {
        expect(initialState(() => 'a')).toEqual(stateOf(['a']))
    })
})

describe('planLabel', () => {
    it('falls back to the goal amount when the name is blank', () => {
        expect(planLabel(createPlan('a'))).toBe('1억 목표')
        expect(planLabel({ ...createPlan('a'), name: '  ', goal: 50_000_000 })).toBe('5,000만 목표')
        expect(planLabel({ ...createPlan('a'), name: ' 내 집 ' })).toBe('내 집')
    })
})

describe('state transitions', () => {
    it('addPlan appends a default plan and activates it', () => {
        const next = addPlan(stateOf(['a']), 'b')
        expect(next.plans.map(p => p.id)).toEqual(['a', 'b'])
        expect(next.plans[1]).toEqual(createPlan('b'))
        expect(next.activeId).toBe('b')
    })

    it('updatePlan changes only the target plan', () => {
        const next = updatePlan(stateOf(['a', 'b']), 'b', { asset: 5_000, name: '비상금' })
        expect(next.plans[0]).toEqual(createPlan('a'))
        expect(next.plans[1]).toMatchObject({ id: 'b', asset: 5_000, name: '비상금' })
    })

    it('selectPlan ignores unknown ids', () => {
        const state = stateOf(['a', 'b'])
        expect(selectPlan(state, 'b').activeId).toBe('b')
        expect(selectPlan(state, 'zzz')).toBe(state)
    })

    it('removePlan moves the selection to the next plan, or the previous one at the end', () => {
        expect(removePlan(stateOf(['a', 'b', 'c'], 'b'), 'b')).toMatchObject({ activeId: 'c' })
        expect(removePlan(stateOf(['a', 'b', 'c'], 'c'), 'c')).toMatchObject({ activeId: 'b' })
    })

    it('removePlan keeps the selection when another plan is removed', () => {
        const next = removePlan(stateOf(['a', 'b', 'c'], 'a'), 'c')
        expect(next.plans.map(p => p.id)).toEqual(['a', 'b'])
        expect(next.activeId).toBe('a')
    })

    it('removePlan never removes the last plan', () => {
        const state = stateOf(['a'])
        expect(removePlan(state, 'a')).toBe(state)
    })
})

describe('parseState', () => {
    it('returns null for missing, broken or empty data', () => {
        expect(parseState(null)).toBeNull()
        expect(parseState('')).toBeNull()
        expect(parseState('not json')).toBeNull()
        expect(parseState('[]')).toBeNull()
        expect(parseState('{}')).toBeNull()
        expect(parseState('{"plans":[],"activeId":"a"}')).toBeNull()
    })

    it('round-trips a saved state', () => {
        const state = updatePlan(addPlan(stateOf(['a']), 'b'), 'a', { currentDate: '2026-01-05' })
        expect(parseState(JSON.stringify(state))).toEqual(state)
    })

    it('drops malformed plans but keeps the good ones', () => {
        const raw = JSON.stringify({
            plans: [createPlan('a'), { ...createPlan('b'), payday: null }, { id: 'c' }],
            activeId: 'a',
        })
        expect(parseState(raw)).toEqual(stateOf(['a']))
    })

    it('points a dangling activeId at the first plan', () => {
        const raw = JSON.stringify({ plans: [createPlan('a'), createPlan('b')], activeId: 'gone' })
        expect(parseState(raw)?.activeId).toBe('a')
    })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/lib/plans.test.ts`
Expected: FAIL — `Failed to resolve import "./plans.ts"`.

- [ ] **Step 3: 구현** — `src/lib/plans.ts`

```ts
// 플랜(목표 하나에 대한 입력 묶음) 모델과 상태 전이. React 와 무관한 순수 함수.
import { koreanUnit } from './format.ts'

export type Plan = {
    id: string
    /** 비어 있으면 탭에 '1억 목표'처럼 목표금액으로 표시한다. */
    name: string
    goal: number
    /** 'YYYY-MM-DD'. null 이면 항상 오늘 날짜로 계산한다. */
    currentDate: string | null
    endDate: string
    asset: number
    payday: number
    stepUp: number
}

export type PlanPatch = Partial<Omit<Plan, 'id'>>

export type PlansState = { plans: Plan[]; activeId: string }

export const STORAGE_KEY = 'step-up-savings/v1'

export function createPlan(id: string): Plan {
    return {
        id,
        name: '',
        goal: 100_000_000,
        currentDate: null,
        endDate: '2029-12-31',
        asset: 0,
        payday: 21,
        stepUp: 100_000,
    }
}

export function initialState(newId: () => string): PlansState {
    const plan = createPlan(newId())
    return { plans: [plan], activeId: plan.id }
}

export function planLabel(plan: Plan): string {
    return plan.name.trim() || `${koreanUnit(plan.goal)} 목표`
}

export function addPlan(state: PlansState, id: string): PlansState {
    return { plans: [...state.plans, createPlan(id)], activeId: id }
}

export function updatePlan(state: PlansState, id: string, patch: PlanPatch): PlansState {
    return { ...state, plans: state.plans.map(p => (p.id === id ? { ...p, ...patch } : p)) }
}

export function selectPlan(state: PlansState, id: string): PlansState {
    return state.plans.some(p => p.id === id) ? { ...state, activeId: id } : state
}

/** 마지막 하나는 지우지 않는다. 보고 있던 플랜을 지우면 다음(없으면 이전) 플랜으로 옮긴다. */
export function removePlan(state: PlansState, id: string): PlansState {
    const index = state.plans.findIndex(p => p.id === id)
    if (state.plans.length <= 1 || index === -1) return state
    const plans = state.plans.filter(p => p.id !== id)
    const activeId = state.activeId === id ? plans[Math.min(index, plans.length - 1)].id : state.activeId
    return { plans, activeId }
}

function isPlan(value: unknown): value is Plan {
    if (typeof value !== 'object' || value === null) return false
    const p = value as Record<string, unknown>
    return (
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.goal === 'number' &&
        (p.currentDate === null || typeof p.currentDate === 'string') &&
        typeof p.endDate === 'string' &&
        typeof p.asset === 'number' &&
        typeof p.payday === 'number' &&
        typeof p.stepUp === 'number'
    )
}

/** 저장된 JSON 을 검증해 읽는다. 쓸 수 있는 플랜이 하나도 없으면 null. */
export function parseState(raw: string | null): PlansState | null {
    if (!raw) return null
    let data: unknown
    try {
        data = JSON.parse(raw)
    } catch {
        return null
    }
    if (typeof data !== 'object' || data === null) return null
    const { plans, activeId } = data as { plans?: unknown; activeId?: unknown }
    if (!Array.isArray(plans)) return null
    const valid = plans.filter(isPlan)
    if (valid.length === 0) return null
    const active = valid.find(p => p.id === activeId) ?? valid[0]
    return { plans: valid, activeId: active.id }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 전체 통과.

- [ ] **Step 5: 훅 작성** — `src/hooks/usePlans.ts`

```ts
// plans.ts 의 상태 전이를 React 상태로 감싸고, 바뀔 때마다 localStorage 에 저장한다.
import { useEffect, useState } from 'react'
import { STORAGE_KEY, addPlan, initialState, parseState, removePlan, selectPlan, updatePlan, type PlanPatch, type PlansState } from '../lib/plans.ts'

// file:// 에서도 동작하도록 crypto.randomUUID 대신 시간 + 난수로 만든다.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function load(): PlansState {
    try {
        return parseState(localStorage.getItem(STORAGE_KEY)) ?? initialState(newId)
    } catch {
        return initialState(newId)
    }
}

export function usePlans() {
    const [state, setState] = useState(load)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch {
            // 저장할 수 없어도 계산은 계속 동작해야 한다.
        }
    }, [state])

    const active = state.plans.find(p => p.id === state.activeId) ?? state.plans[0]

    return {
        plans: state.plans,
        active,
        select: (id: string) => setState(s => selectPlan(s, id)),
        add: () => setState(s => addPlan(s, newId())),
        update: (id: string, patch: PlanPatch) => setState(s => updatePlan(s, id, patch)),
        remove: (id: string) => setState(s => removePlan(s, id)),
    }
}
```

- [ ] **Step 6: 타입 확인**

Run: `npx tsc -b`
Expected: 오류 0. (훅 동작은 Task 5 에서 화면으로 확인한다.)

- [ ] **Step 7: 커밋**

```bash
git add src/lib/plans.ts src/lib/plans.test.ts src/hooks/usePlans.ts
git commit -m "feat: add plan model, transitions and persistence hook"
```

---

### Task 5: Electron 창 + 화면 골격 (탭 · 입력 · 삭제)

**Files:**
- Create: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src/components/PlanTabs.tsx`, `src/components/PlanForm.tsx`, `src/components/MoneyInput.tsx`, `src/components/DeletePlan.tsx`
- Create: `electron/main.cjs`, `scripts/screenshot.cjs`
- Modify: `package.json` (`main`, `scripts`), `.gitignore`

**Interfaces:**
- Consumes: Task 3 `formatWon`, `moneyHint`, `parseMoney`, `caretAfterDigits`, `todayISO`; Task 4 `usePlans`, `planLabel`, `Plan`, `PlanPatch`
- Produces:
  - `PlanTabs({ plans, activeId, onSelect, onAdd })`
  - `PlanForm({ plan, today, onChange })` — `onChange(patch: PlanPatch)`
  - `MoneyInput({ label, value, onChange })` — `onChange(value: number)`
  - `DeletePlan({ disabled, onDelete })`
  - `npm run app` — 빌드 후 Electron 창 실행
  - `npm run shot -- <out.png> [seed.json]` — 빌드된 화면을 PNG 로 저장(화면보다 길면 `out-2.png`, `out-3.png` … 로 나눔). seed 는 `PlansState` JSON.
  - CSS 클래스(Task 6 이 그대로 사용): `.card`, `.card-title`, `.app-main`, `--accent` 등 `:root` 토큰

- [ ] **Step 1: Electron 설치**

Run: `npm install -D electron@^44.7.0`
Expected: `added N packages` (Electron 바이너리 다운로드 포함, 수십 초 걸릴 수 있음).

- [ ] **Step 2: package.json 의 main · scripts 수정**

`"type": "module",` 다음 줄에 추가:
```json
    "main": "electron/main.cjs",
```

`"scripts"` 를 다음으로 교체:
```json
    "scripts": {
        "dev": "vite",
        "test": "vitest run",
        "app": "tsc -b && vite build && electron .",
        "shot": "electron scripts/screenshot.cjs",
        "build": "tsc -b && vite build"
    },
```

`.gitignore` 끝에 `.shots/` 한 줄 추가.

- [ ] **Step 3: Electron 메인 프로세스** — `electron/main.cjs`

```js
// 증액저축 계산기 — Electron 메인 프로세스. 작은 창 하나에 dist/index.html 을 띄운다.
const path = require('node:path')
const { app, BrowserWindow, Menu, screen } = require('electron')

function createWindow() {
    // 노트북처럼 작업 영역이 낮으면 창 높이를 거기에 맞춘다.
    const workHeight = screen.getPrimaryDisplay().workAreaSize.height - 40
    const win = new BrowserWindow({
        width: 460,
        height: Math.min(820, workHeight),
        minWidth: 400,
        minHeight: Math.min(640, workHeight),
        title: '증액저축 계산기',
        backgroundColor: '#f6f2ea',
        show: false,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    })
    win.once('ready-to-show', () => win.show())
    // 앱 안에서 새 창을 열지 않는다.
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

Menu.setApplicationMenu(null)
app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

- [ ] **Step 4: 화면 캡처 스크립트(개발용)** — `scripts/screenshot.cjs`

```js
// 개발용: 빌드된 dist/index.html 을 실제 앱과 같은 크기의 숨은 창에 띄워 PNG 로 저장한다. exe 에는 포함되지 않는다.
// 사용: npm run shot -- .shots/out.png [seed.json]   (seed = localStorage 에 넣을 PlansState JSON)
// 화면보다 길면 스크롤하며 out.png, out-2.png, out-3.png … 로 나눠 저장한다.
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow } = require('electron')

const STORAGE_KEY = 'step-up-savings/v1'
const HEADER_OVERLAP = 120 // 고정 헤더에 가려지는 부분이 다음 장에 다시 나오도록 겹쳐 찍는다.
const [out = '.shots/screenshot.png', seedPath] = process.argv.slice(2)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

app.whenReady().then(async () => {
    const win = new BrowserWindow({ width: 460, height: 820, show: false })
    const run = script => win.webContents.executeJavaScript(script)
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

    // 매번 같은 상태에서 찍도록 저장값을 seed 로 덮거나 지운 뒤 다시 읽힌다.
    const seed = seedPath ? fs.readFileSync(path.resolve(seedPath), 'utf-8') : null
    await run(
        seed === null
            ? `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`
            : `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(seed)})`,
    )
    const reloaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve))
    win.webContents.reloadIgnoringCache()
    await reloaded
    await run('document.fonts.ready.then(() => true)')
    await sleep(200)

    const viewport = await run('window.innerHeight')
    const total = await run('document.documentElement.scrollHeight')
    const base = path.resolve(out).replace(/\.png$/i, '')
    fs.mkdirSync(path.dirname(base), { recursive: true })
    for (let page = 1, top = 0; ; page += 1, top += viewport - HEADER_OVERLAP) {
        await run(`window.scrollTo(0, ${top})`)
        await sleep(150)
        const file = page === 1 ? `${base}.png` : `${base}-${page}.png`
        fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG())
        console.log(`saved ${file}`)
        if (top + viewport >= total) break
    }
    app.quit()
})
```

- [ ] **Step 5: HTML · 진입점** — `index.html`, `src/main.tsx`

`index.html`:
```html
<!doctype html>
<html lang="ko">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>증액저축 계산기</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
    </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
```

- [ ] **Step 6: 금액 입력** — `src/components/MoneyInput.tsx`

```tsx
import { useId, useLayoutEffect, useRef } from 'react'
import { caretAfterDigits, formatWon, moneyHint, parseMoney } from '../lib/format.ts'

type Props = { label: string; value: number; onChange: (value: number) => void }

/** 콤마가 자동으로 찍히는 원 단위 입력칸. 0 은 빈칸으로 보여준다. */
export function MoneyInput({ label, value, onChange }: Props) {
    const id = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    // 입력 직후 커서 앞에 있던 숫자 개수. 콤마가 다시 찍혀도 커서를 같은 숫자 뒤에 둔다.
    const pendingCaret = useRef<number | null>(null)

    useLayoutEffect(() => {
        const input = inputRef.current
        if (input === null || pendingCaret.current === null) return
        const pos = caretAfterDigits(input.value, pendingCaret.current)
        input.setSelectionRange(pos, pos)
        pendingCaret.current = null
    })

    return (
        <div className="field">
            <div className="field-head">
                <label className="field-label" htmlFor={id}>
                    {label}
                </label>
            </div>
            <div className="field-control money">
                <input
                    ref={inputRef}
                    id={id}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={value === 0 ? '' : formatWon(value)}
                    onChange={e => {
                        const { value: text, selectionStart } = e.target
                        pendingCaret.current = text.slice(0, selectionStart ?? text.length).replace(/\D/g, '').length
                        onChange(parseMoney(text))
                    }}
                />
                <span className="field-affix">원</span>
            </div>
            <span className="field-hint">{moneyHint(value)}</span>
        </div>
    )
}
```

- [ ] **Step 7: 입력 카드** — `src/components/PlanForm.tsx`

```tsx
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
```

- [ ] **Step 8: 플랜 탭** — `src/components/PlanTabs.tsx`

```tsx
import { useEffect, useRef } from 'react'
import { planLabel, type Plan } from '../lib/plans.ts'

type Props = { plans: Plan[]; activeId: string; onSelect: (id: string) => void; onAdd: () => void }

export function PlanTabs({ plans, activeId, onSelect, onAdd }: Props) {
    const listRef = useRef<HTMLDivElement>(null)

    // 새 플랜을 추가하거나 탭을 바꾸면 선택된 탭이 보이게 스크롤한다.
    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeId, plans.length])

    return (
        <nav className="tabs" aria-label="저축 플랜">
            <div className="tabs-scroll" role="tablist" ref={listRef}>
                {plans.map(p => (
                    <button key={p.id} type="button" role="tab" aria-selected={p.id === activeId} className="tab" onClick={() => onSelect(p.id)}>
                        {planLabel(p)}
                    </button>
                ))}
            </div>
            <button type="button" className="tab-add" onClick={onAdd} aria-label="플랜 추가" title="플랜 추가">
                +
            </button>
        </nav>
    )
}
```

- [ ] **Step 9: 플랜 삭제** — `src/components/DeletePlan.tsx`

```tsx
import { useState } from 'react'

type Props = { disabled: boolean; onDelete: () => void }

/** 한 번 더 물어보고 지운다. 플랜이 하나뿐이면 비활성. */
export function DeletePlan({ disabled, onDelete }: Props) {
    const [confirming, setConfirming] = useState(false)

    if (confirming) {
        return (
            <div className="danger-zone">
                <span>이 플랜을 삭제할까요?</span>
                <button type="button" className="btn btn-danger" onClick={onDelete}>
                    삭제
                </button>
                <button type="button" className="btn btn-plain" onClick={() => setConfirming(false)}>
                    취소
                </button>
            </div>
        )
    }

    return (
        <div className="danger-zone">
            <button
                type="button"
                className="btn btn-ghost"
                disabled={disabled}
                title={disabled ? '플랜이 하나뿐이라 삭제할 수 없어요' : undefined}
                onClick={() => setConfirming(true)}
            >
                플랜 삭제
            </button>
        </div>
    )
}
```

- [ ] **Step 10: App** — `src/App.tsx`

```tsx
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
```

- [ ] **Step 11: 스타일** — `src/index.css`

```css
/* 증액저축 계산기 — 따뜻한 아이보리 바탕 + 딥 그린 포인트 */
:root {
    --bg: #f6f2ea;
    --surface: #ffffff;
    --surface-sunken: #faf7f1;
    --ink: #1c2420;
    --ink-2: #57625c;
    --ink-3: #8b948f;
    --line: #ebe5da;
    --accent: #1e7a55;
    --accent-strong: #135c3f;
    --accent-soft: #d9ede3;
    --accent-tint: #f1f8f4;
    --danger: #c0392b;
    --danger-soft: #fbeae7;
    --radius-lg: 18px;
    --radius-md: 12px;
    --shadow: 0 1px 2px rgb(28 36 32 / 0.04), 0 8px 24px rgb(28 36 32 / 0.06);

    color-scheme: light;
    font-family: 'Pretendard Variable', Pretendard, 'Segoe UI', 'Malgun Gothic', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
}

*,
*::before,
*::after {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-width: 360px;
    background: var(--bg);
}

button,
input,
select {
    font: inherit;
    color: inherit;
}

button {
    cursor: pointer;
}

h1,
h2,
p {
    margin: 0;
}

:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.app {
    max-width: 560px;
    margin: 0 auto;
    padding: 0 16px 28px;
}

/* ── 헤더 · 탭 ── */
.app-header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 16px 0 12px;
    background: rgb(246 242 234 / 0.92);
    backdrop-filter: blur(8px);
}

.brand {
    display: flex;
    align-items: center;
    gap: 8px;
}

.brand-mark {
    width: 22px;
    height: 22px;
    fill: var(--accent);
}

.brand-title {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
}

.tabs-scroll {
    display: flex;
    gap: 6px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
}

.tabs-scroll::-webkit-scrollbar {
    display: none;
}

.tab {
    flex: none;
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-2);
    font-weight: 600;
    white-space: nowrap;
    transition:
        background 0.15s,
        color 0.15s,
        border-color 0.15s;
}

.tab:hover {
    border-color: #d8d0c2;
    color: var(--ink);
}

.tab[aria-selected='true'] {
    border-color: var(--ink);
    background: var(--ink);
    color: #fff;
}

.tab-add {
    flex: none;
    width: 34px;
    height: 34px;
    border: 1px dashed #cfc6b6;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    font-size: 20px;
    line-height: 1;
}

.tab-add:hover {
    border-style: solid;
    border-color: var(--accent);
    background: var(--accent-tint);
    color: var(--accent);
}

/* ── 카드 ── */
.app-main {
    display: grid;
    gap: 12px;
}

.card {
    padding: 18px;
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
}

.card-title {
    font-size: 14px;
    font-weight: 700;
}

/* ── 입력 ── */
.plan-name {
    width: 100%;
    margin-bottom: 14px;
    padding: 2px 0 6px;
    border: 0;
    border-bottom: 1px dashed var(--line);
    outline: none;
    background: transparent;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.plan-name::placeholder {
    color: var(--ink);
    opacity: 1;
}

.plan-name:focus {
    border-bottom: 1px solid var(--accent);
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 12px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}

.field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 20px;
}

.field-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-2);
}

.field-control {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-sunken);
    transition:
        border-color 0.15s,
        box-shadow 0.15s,
        background 0.15s;
}

.field-control:focus-within {
    border-color: var(--accent);
    background: var(--surface);
    box-shadow: 0 0 0 3px var(--accent-soft);
}

.field-control input,
.field-control select {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 15px;
    font-weight: 600;
}

.field-control.money input {
    text-align: right;
}

.field-control input::placeholder {
    color: var(--ink-3);
    font-weight: 500;
}

.field-control input[type='date']::-webkit-calendar-picker-indicator {
    opacity: 0.45;
    cursor: pointer;
}

.field-control.select select {
    padding-right: 18px;
    appearance: none;
    cursor: pointer;
    text-align-last: right;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' fill='none' stroke='%238b948f' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
        no-repeat right center / 12px;
}

.field-affix {
    flex: none;
    font-size: 13px;
    color: var(--ink-3);
}

.field-hint {
    min-height: 16px;
    font-size: 11.5px;
    color: var(--ink-3);
    text-align: right;
}

.badge {
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-size: 11px;
    font-weight: 700;
}

.link-btn {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
}

.link-btn:hover {
    text-decoration: underline;
}

/* ── 버튼 · 삭제 ── */
.btn {
    height: 34px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 10px;
    font-weight: 600;
}

.btn-ghost {
    background: transparent;
    color: var(--ink-3);
}

.btn-ghost:hover:not(:disabled) {
    background: var(--danger-soft);
    color: var(--danger);
}

.btn-ghost:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.btn-danger {
    background: var(--danger);
    color: #fff;
}

.btn-plain {
    border-color: var(--line);
    background: var(--surface);
    color: var(--ink-2);
}

.danger-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding-top: 4px;
    font-size: 13px;
    color: var(--ink-2);
}
```

- [ ] **Step 12: 타입 · 테스트 · 빌드 확인**

Run: `npm test && npm run build`
Expected: 테스트 전부 PASS, `tsc -b` 오류 0, `vite build` 가 `dist/index.html` 과 `dist/assets/*` 생성.

- [ ] **Step 13: 화면 확인**

Run: `npm run shot -- .shots/task5-default.png`
Expected: `saved ...\.shots\task5-default.png`. 이미지를 열어 확인:
- 헤더에 막대 3개 로고 + "증액저축 계산기", 탭 `1억 목표` 하나와 `+` 버튼
- 입력 카드: 제목 자리에 "1억 목표", 목표금액 `100,000,000 원` + 힌트 `1억 원`, 현재자산 빈칸, 현재날짜 = 오늘 + "오늘" 배지, 완료날짜 2029-12-31, 매월 21일, 연간 증액액 `100,000 원` + `10만 원`
- Pretendard 글꼴(맑은 고딕이 아님), 하단에 흐린 "플랜 삭제"(비활성)

`.shots/seed-two.json` 을 만들고(gitignore 대상):
```json
{"plans":[{"id":"a","name":"","goal":100000000,"currentDate":null,"endDate":"2029-12-31","asset":0,"payday":21,"stepUp":100000},{"id":"b","name":"","goal":50000000,"currentDate":"2026-01-05","endDate":"2029-12-31","asset":27504909,"payday":21,"stepUp":130000}],"activeId":"b"}
```
Run: `npm run shot -- .shots/task5-two.png .shots/seed-two.json`
Expected: 탭 2개(`1억 목표`, 선택된 `5,000만 목표`), 현재날짜 2026-01-05 옆에 "오늘로" 버튼, 현재자산 `27,504,909` + `약 2,750만 원`, "플랜 삭제" 활성.

- [ ] **Step 14: 실제 창 확인**

Run: `npm run app`
Expected: 460×820(작은 화면이면 그보다 낮게) 창, 메뉴바 없음. 직접 확인: `+` 로 탭 추가 → 새 탭 선택, 금액 중간 숫자 수정 시 커서 유지, 창 닫고 `npm run app` 다시 → 입력값 유지. 창을 닫아 종료.

- [ ] **Step 15: 커밋**

```bash
git add .gitignore package.json package-lock.json index.html src electron scripts
git commit -m "feat: add Electron window with plan tabs and input form"
```

---

### Task 6: 요약 · 결과 · 차트

**Files:**
- Create: `src/lib/chart.ts`, `src/components/SummaryBar.tsx`, `src/components/ResultCards.tsx`, `src/components/YearlyChart.tsx`
- Modify: `src/App.tsx` (결과 연결), `src/index.css` (끝에 추가)
- Test: `src/lib/chart.test.ts`

**Interfaces:**
- Consumes: Task 2 `calcPlan`, `PlanResult`, `YearRow`; Task 3 `formatWon`, `formatYMD`, `koreanUnit`, `compactWon`; Task 4 `Plan`; Task 5 CSS 토큰과 `.card`
- Produces:
  - `chartLabels(count: number, slot: number): { value: boolean[]; year: boolean[]; months: boolean }`
  - `SummaryBar({ plan, result })`, `ResultCards({ result, stepUp })`, `YearlyChart({ rows, flatMonthly })`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/chart.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { chartLabels } from './chart.ts'

describe('chartLabels', () => {
    it('shows every label when bars are wide', () => {
        expect(chartLabels(4, 92)).toEqual({
            value: [true, true, true, true],
            year: [true, true, true, true],
            months: true,
        })
    })

    it('thins labels out for a far completion date so they never overlap', () => {
        const labels = chartLabels(20, 18.4)
        expect(labels.value.filter(Boolean)).toHaveLength(2)
        expect(labels.value[0]).toBe(true)
        expect(labels.value[19]).toBe(true)
        expect(labels.year.map((shown, i) => (shown ? i : -1)).filter(i => i >= 0)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18])
        expect(labels.months).toBe(false)
    })

    it('handles a single bar', () => {
        expect(chartLabels(1, 368)).toEqual({ value: [true], year: [true], months: true })
    })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/lib/chart.test.ts`
Expected: FAIL — `Failed to resolve import "./chart.ts"`.

- [ ] **Step 3: 구현** — `src/lib/chart.ts`

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 전체 통과.

- [ ] **Step 5: 요약 바** — `src/components/SummaryBar.tsx`

```tsx
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
```

- [ ] **Step 6: 결과 카드** — `src/components/ResultCards.tsx`

```tsx
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
```

- [ ] **Step 7: 차트** — `src/components/YearlyChart.tsx`

```tsx
import { chartLabels } from '../lib/chart.ts'
import { compactWon } from '../lib/format.ts'
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
                    <path
                        key={r.year}
                        className={i === 0 ? 'chart-bar is-first' : 'chart-bar'}
                        d={barPath(cx(i) - barW / 2, y(r.monthly), barW, baseY - y(r.monthly), 6)}
                    />
                ))}
                <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={baseY} y2={baseY} />
                <line className="chart-flat" x1={PAD.left} x2={W - PAD.right} y1={flatY} y2={flatY} />
                {rows.map((r, i) => (
                    <g key={r.year}>
                        {labels.value[i] && (
                            <text className="chart-value" x={cx(i)} y={y(r.monthly) - 8} textAnchor="middle">
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
```

- [ ] **Step 8: App 에 연결** — `src/App.tsx` 전체를 다음으로 교체

```tsx
import { DeletePlan } from './components/DeletePlan.tsx'
import { PlanForm } from './components/PlanForm.tsx'
import { PlanTabs } from './components/PlanTabs.tsx'
import { ResultCards } from './components/ResultCards.tsx'
import { SummaryBar } from './components/SummaryBar.tsx'
import { YearlyChart } from './components/YearlyChart.tsx'
import { usePlans } from './hooks/usePlans.ts'
import { todayISO } from './lib/format.ts'
import { calcPlan } from './lib/savings.ts'

export default function App() {
    const { plans, active, select, add, update, remove } = usePlans()
    const today = todayISO()
    const result = calcPlan({ ...active, currentDate: active.currentDate ?? today })

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
                <SummaryBar plan={active} result={result} />
                <ResultCards result={result} stepUp={active.stepUp} />
                {result.status === 'ok' && result.stepUp.ok && <YearlyChart rows={result.stepUp.rows} flatMonthly={result.flatMonthly} />}
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
```

- [ ] **Step 9: 스타일 추가** — `src/index.css` 끝에 추가

```css
/* ── 요약 ── */
.progress-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
}

.progress-caption {
    font-size: 12.5px;
    color: var(--ink-2);
}

.progress-pct {
    font-size: 18px;
    font-weight: 800;
    color: var(--accent);
}

.progress {
    height: 10px;
    margin-top: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--accent-tint);
}

.progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #3a9a72, var(--accent));
    transition: width 0.4s ease;
}

.stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 16px 0 0;
}

.stat {
    min-width: 0;
}

.stat dt {
    font-size: 11.5px;
    color: var(--ink-3);
}

.stat dd {
    margin: 2px 0 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.stat dd small {
    margin-left: 2px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-3);
}

/* ── 결과 ── */
.result-kicker {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
}

.step-no {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--ink);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
}

.result-amount {
    margin-top: 8px;
    font-size: 30px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.03em;
}

.result-amount .unit {
    margin-left: 3px;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink-2);
}

.result-from {
    margin-left: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-3);
}

.result-sub {
    margin-top: 6px;
    font-size: 12.5px;
    color: var(--ink-3);
}

.result-step .result-amount {
    color: var(--accent-strong);
}

.year-table {
    width: 100%;
    margin-top: 14px;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
}

.year-table th {
    padding: 0 6px 8px;
    border-bottom: 1px solid var(--line);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-3);
    text-align: right;
}

.year-table td {
    padding: 10px 6px;
    border-bottom: 1px solid var(--line);
    text-align: right;
}

.year-table th:first-child,
.year-table td:first-child {
    text-align: left;
}

.year-table tbody tr.is-first td {
    background: var(--accent-tint);
}

.year-table .monthly {
    font-size: 14.5px;
    font-weight: 800;
    color: var(--accent-strong);
}

.year-table tfoot td {
    padding-top: 10px;
    border-bottom: 0;
    font-weight: 700;
    color: var(--ink-2);
}

.tag {
    margin-left: 6px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 10.5px;
    font-weight: 700;
    vertical-align: 1px;
}

.inline-notice {
    margin-top: 10px;
    padding: 12px;
    border-radius: var(--radius-md);
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 13px;
}

.notice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.notice-icon {
    font-size: 26px;
    line-height: 1;
}

.notice-title {
    font-size: 15px;
    font-weight: 800;
}

.notice-body {
    margin-top: 2px;
    font-size: 13px;
    color: var(--ink-2);
}

/* ── 차트 ── */
.chart-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.legend {
    display: flex;
    gap: 12px;
    font-size: 11.5px;
    color: var(--ink-2);
}

.legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.swatch-bar {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--accent);
}

.swatch-line {
    width: 16px;
    border-top: 2px dashed var(--ink-2);
}

.chart {
    display: block;
    width: 100%;
    height: auto;
    margin-top: 6px;
    overflow: visible;
}

.chart-bar {
    fill: #a9d3be;
}

.chart-bar.is-first {
    fill: var(--accent);
}

.chart-axis {
    stroke: var(--line);
    stroke-width: 1;
}

.chart-flat {
    stroke: var(--ink-2);
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
}

.chart-value {
    font-size: 11px;
    font-weight: 700;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
    stroke-linejoin: round;
}

.chart-year {
    font-size: 11px;
    font-weight: 600;
    fill: var(--ink-2);
}

.chart-months {
    font-size: 10px;
    fill: var(--ink-3);
}
```

- [ ] **Step 10: 테스트 · 빌드**

Run: `npm test && npm run build`
Expected: 전부 PASS, 빌드 성공.

- [ ] **Step 11: 엑셀 대조 화면 확인**

`.shots/seed-sheet.json`:
```json
{"plans":[{"id":"a","name":"엑셀 대조","goal":100000000,"currentDate":"2026-01-05","endDate":"2029-12-31","asset":27504909,"payday":21,"stepUp":130000}],"activeId":"a"}
```
Run: `npm run shot -- .shots/task6-sheet.png .shots/seed-sheet.json`
Expected 이미지(`task6-sheet.png` 와 이어지는 `task6-sheet-2.png` … 를 모두 본다):
- 요약: `27%`, 차액 `72,495,091원`, 남은 개월 `48개월`, 다음 월급날 `2026.01.21`
- ① `1,510,315원`, "48개월 동안 매달 · 총 72,495,120원"
- ② `1,315,315원 부터`, 표 2026(첫해) 12 1,315,315 / 2027 1,445,315 / 2028 1,575,315 / 2029 1,705,315, 총 저축액 72,495,120
- 차트: 막대 4개(첫해 진한 초록), 막대 위 `131.5만` `144.5만` `157.5만` `170.5만`, 균등 점선은 둘째와 셋째 막대 사이 높이, 범례 `균등 151만`

`.shots/seed-edge.json` (멀리 떨어진 완료일 + 마감 상태 플랜):
```json
{"plans":[{"id":"far","name":"먼 미래","goal":300000000,"currentDate":"2026-10-12","endDate":"2045-12-31","asset":10000000,"payday":21,"stepUp":100000},{"id":"done","name":"달성","goal":10000000,"currentDate":null,"endDate":"2029-12-31","asset":20000000,"payday":21,"stepUp":100000}],"activeId":"far"}
```
Run: `npm run shot -- .shots/task6-far.png .shots/seed-edge.json`
Expected: 막대 20개, 금액 라벨은 첫 막대와 마지막 막대에만, 연도 라벨은 하나 걸러, 라벨끼리 겹치지 않음. 표는 20행.

같은 seed 에서 `"activeId":"done"` 으로 바꿔 `.shots/task6-done.png` 촬영 → 🎉 "이미 목표를 달성했어요" 카드, 차트 없음, 진행률 100%.

- [ ] **Step 12: 커밋**

```bash
git add src
git commit -m "feat: show summary, flat and step-up results with yearly chart"
```

---

### Task 7: 단일 exe 패키징 + README

**Files:**
- Modify: `package.json` (`scripts.build`, `build` 설정 추가)
- Create: `README.md`

**Interfaces:**
- Consumes: Task 5 `electron/main.cjs`, `dist/`
- Produces: `npm run build` → `release/증액저축계산기.exe`

- [ ] **Step 1: electron-builder 설치**

Run: `npm install -D electron-builder@^26.15.3`
Expected: `added N packages`.

- [ ] **Step 2: package.json 수정**

`scripts.build` 를 교체:
```json
        "build": "tsc -b && vite build && electron-builder"
```

최상위에 `build` 키 추가(`devDependencies` 위):
```json
    "build": {
        "appId": "kr.bible.stepupsavings",
        "productName": "증액저축계산기",
        "directories": {
            "output": "release"
        },
        "files": [
            "dist/**/*",
            "electron/**/*"
        ],
        "win": {
            "target": [
                {
                    "target": "portable",
                    "arch": ["x64"]
                }
            ]
        },
        "portable": {
            "artifactName": "증액저축계산기.exe"
        }
    },
```

- [ ] **Step 3: exe 빌드**

Run: `npm run build` (첫 실행은 Electron·NSIS 도구 다운로드로 수 분 걸릴 수 있음, timeout 10분)
Expected: 마지막 줄 근처에 `building target=portable file=release\증액저축계산기.exe`, 오류 없이 종료.

빌드가 실패하면 원인별로:
- `Cannot create symbolic link` (winCodeSign 압축 해제 실패) → `build.win` 에 `"signAndEditExecutable": false` 추가 후 재시도.
- 한글 파일명 관련 오류 → `portable.artifactName` 을 `StepUpSavings.exe` 로 바꾸고 스펙 7절의 대안대로 진행, README 에도 반영.

- [ ] **Step 4: 산출물 확인**

Run: `ls -la release/*.exe`
Expected: `release/증액저축계산기.exe` 하나, 크기 대략 60~100MB.

다시 `npm run build` 실행 → 같은 파일의 수정 시각이 갱신되는지 확인(덮어쓰기).

- [ ] **Step 5: exe 실행 확인**

PowerShell:
```powershell
$exe = Start-Process -FilePath "release\증액저축계산기.exe" -PassThru
Start-Sleep -Seconds 10
Get-Process | Where-Object { $_.MainWindowTitle -eq '증액저축 계산기' } | Select-Object Id, ProcessName, MainWindowTitle
```
Expected: `MainWindowTitle` 이 `증액저축 계산기` 인 프로세스 1개.

그 다음 저장 위치 확인:
```powershell
Test-Path "$env:APPDATA\증액저축계산기\Local Storage"
```
Expected: `True`.

창을 닫는다:
```powershell
Get-Process | Where-Object { $_.MainWindowTitle -eq '증액저축 계산기' } | ForEach-Object { $_.CloseMainWindow() | Out-Null }
```

- [ ] **Step 6: README 작성** — `README.md`

````markdown
# 증액저축 계산기

목표금액까지 남은 금액을 **매달 같은 금액**으로 모을 때와 **매년 정해진 금액씩 늘려** 모을 때의 월 저축액을 계산하는 작은 데스크톱 앱입니다.

## 실행

`release/증액저축계산기.exe` 를 더블클릭하면 설치 없이 바로 열립니다. 입력한 플랜은 `%APPDATA%\증액저축계산기` 에 저장되어 다시 열어도 남아 있습니다.

## 개발

```bash
npm install
npm run dev     # 브라우저에서 화면 개발
npm test        # 계산 로직 테스트
npm run app     # 빌드 후 Electron 창으로 확인
npm run build   # release/증액저축계산기.exe 갱신 (실행 중인 exe 는 먼저 닫기)
npm run shot -- .shots/out.png [seed.json]   # 빌드된 화면을 PNG 로 저장
```

## 계산 규칙

- **남은 개월 수**: `현재날짜 < 그 달 월급날 ≤ 완료날짜` 인 달의 수. 월급날 전이면 이번 달 포함, 월급날 당일부터는 제외. 완료일이 그 달 월급날보다 이르면 마지막 달도 제외. 31일처럼 없는 날은 그 달 말일.
- **균등 저축**: `올림(차액 ÷ 남은 개월 수)`
- **증액 저축**: 현재날짜의 연도(남은 월급날이 없으면 다음 해)를 첫해로, 해마다 월 저축액이 연간 증액액만큼 늘어남. `Σ 그해 개월 수 × 그해 월 저축액 = 차액` 이 되도록 첫해 금액을 구하고 1원 단위 올림.

자세한 설계는 `docs/superpowers/specs/2026-10-12-step-up-savings-design.md` 참고.
````

- [ ] **Step 7: 최종 확인 · 커밋**

Run: `npm test && git status --short`
Expected: 테스트 전부 PASS, 변경 파일은 `package.json`, `package-lock.json`, `README.md` 뿐(`release/` 는 gitignore).

```bash
git add package.json package-lock.json README.md
git commit -m "build: package as a single portable exe with electron-builder"
```
