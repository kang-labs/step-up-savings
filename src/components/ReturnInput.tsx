import { useId, useRef, useState } from 'react'
import { cleanPercentInput, formatPercent, percentToBp } from '../lib/format.ts'
import type { PlanPatch } from '../lib/plans.ts'

type Props = { on: boolean; bp: number; onChange: (patch: PlanPatch) => void }

/** 연수익 체크 + '연 n %' 입력칸. 입력 중인 '3.' 같은 글자를 지키려고 글자는 따로 들고 있는다. */
export function ReturnInput({ on, bp, onChange }: Props) {
    const id = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    const [text, setText] = useState(() => (bp === 0 ? '' : formatPercent(bp)))

    return (
        <div className="field">
            <div className="field-head">
                <label className="field-label check-label">
                    <input
                        type="checkbox"
                        checked={on}
                        onChange={e => {
                            onChange({ returnOn: e.target.checked })
                            // 켜면 바로 입력할 수 있게 (비활성이 풀린 다음 프레임에)
                            if (e.target.checked) requestAnimationFrame(() => inputRef.current?.focus())
                        }}
                    />
                    연수익
                </label>
            </div>
            <div className={on ? 'field-control money' : 'field-control money is-disabled'}>
                <span className="field-affix">연</span>
                <input
                    ref={inputRef}
                    id={id}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    aria-label="연수익률"
                    disabled={!on}
                    value={text}
                    onChange={e => {
                        const next = cleanPercentInput(e.target.value)
                        if (next === null) return // 소수 셋째 자리·30 초과 등은 받지 않는다
                        setText(next)
                        onChange({ returnBp: percentToBp(next) })
                    }}
                />
                <span className="field-affix">%</span>
            </div>
            <span className="field-hint">{on ? '적금식 · 해마다 복리 · 세금 제외' : ''}</span>
        </div>
    )
}
