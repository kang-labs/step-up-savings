import type { CapacitorConfig } from '@capacitor/cli'

// 안드로이드 앱 설정. 패키지명(appId)은 Play 에 올린 뒤에는 바꿀 수 없다.
const config: CapacitorConfig = {
    appId: 'kr.biblekang.stepupsavings',
    appName: '증액저축',
    webDir: 'dist',
    backgroundColor: '#f6f2ea',
    plugins: {
        // 화면을 상태바·내비게이션 바 아래까지 쓰고(edge-to-edge) 그 높이를 --safe-area-inset-* CSS 변수로 넘긴다.
        // LIGHT = 밝은 바탕 위 진한 아이콘.
        SystemBars: { insetsHandling: 'css', style: 'LIGHT' },
    },
}

export default config
