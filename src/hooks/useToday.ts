// '오늘' 날짜를 상태로 들고 있다가, 자정이 지나거나 앱으로 다시 돌아오면(백그라운드 → 화면) 새로 읽는다.
// 휴대폰은 앱을 닫지 않고 백그라운드에 두었다가 다시 여는 일이 많아, 날짜가 어제에 머물면 남은 개월 수가 틀린다.
import { useEffect, useState } from 'react'
import { msUntilNextDay, todayISO } from '../lib/format.ts'

export function useToday(): string {
    const [today, setToday] = useState(() => todayISO())

    useEffect(() => {
        // 같은 날이면 값이 같아 다시 그려지지 않는다.
        const refresh = () => setToday(todayISO())
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', refresh)
        // 화면을 켜 둔 채 자정을 넘길 때 (1초 여유)
        const timer = window.setTimeout(refresh, msUntilNextDay(new Date()) + 1000)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('focus', refresh)
            window.clearTimeout(timer)
        }
    }, [today])

    return today
}
