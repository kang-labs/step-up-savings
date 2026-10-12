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
