import { describe, expect, it } from 'vitest'
import { horizontalScrollFromWheel } from './wheel.ts'

const strip = (scrollLeft: number) => ({ scrollLeft, scrollWidth: 600, clientWidth: 400 })

describe('horizontalScrollFromWheel', () => {
    it('turns a vertical wheel into horizontal scrolling when the tabs overflow', () => {
        expect(horizontalScrollFromWheel(strip(0), 0, 100)).toBe(100)
        expect(horizontalScrollFromWheel(strip(150), 0, -100)).toBe(50)
    })

    it('clamps to both ends of the strip', () => {
        expect(horizontalScrollFromWheel(strip(150), 0, 300)).toBe(200)
        expect(horizontalScrollFromWheel(strip(50), 0, -300)).toBe(0)
    })

    it('leaves the wheel alone when the tabs fit, the gesture is horizontal, or the strip is already at that end', () => {
        expect(horizontalScrollFromWheel({ scrollLeft: 0, scrollWidth: 300, clientWidth: 400 }, 0, 100)).toBeNull()
        expect(horizontalScrollFromWheel(strip(0), 80, 10)).toBeNull()
        expect(horizontalScrollFromWheel(strip(200), 0, 100)).toBeNull()
        expect(horizontalScrollFromWheel(strip(0), 0, -100)).toBeNull()
    })
})
