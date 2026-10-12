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
