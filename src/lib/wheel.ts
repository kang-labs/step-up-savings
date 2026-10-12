// 마우스 세로 휠로 가로 탭 줄을 넘길 수 있게 한다(크롬은 세로 휠을 가로 스크롤로 바꿔 주지 않는다).

type Strip = { scrollLeft: number; scrollWidth: number; clientWidth: number }

/**
 * 세로 휠을 가로 스크롤로 바꾼 새 scrollLeft.
 * 탭이 넘치지 않거나, 가로 제스처이거나, 이미 그쪽 끝이면 null — 기본 동작(페이지 스크롤)을 그대로 둔다.
 */
export function horizontalScrollFromWheel(strip: Strip, deltaX: number, deltaY: number): number | null {
    const max = strip.scrollWidth - strip.clientWidth
    if (max <= 0 || Math.abs(deltaY) <= Math.abs(deltaX)) return null
    const next = Math.min(max, Math.max(0, strip.scrollLeft + deltaY))
    return next === strip.scrollLeft ? null : next
}
