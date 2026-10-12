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
