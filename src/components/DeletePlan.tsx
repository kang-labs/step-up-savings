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
