import type { CapacitorConfig } from '@capacitor/cli'

// 안드로이드 앱 설정. 패키지명(appId)은 Play 에 올린 뒤에는 바꿀 수 없다.
const config: CapacitorConfig = {
    appId: 'kr.biblekang.stepupsavings',
    appName: '증액저축',
    webDir: 'dist',
    backgroundColor: '#f6f2ea',
    // 앱 안 주소(https://localhost)를 고정한다. 주소가 바뀌면 그 주소에 저장된 플랜(localStorage)을 못 읽게 되므로,
    // 나중에 Capacitor 를 올리면서 기본값이 바뀌어도 그대로 유지되게 한다.
    server: { androidScheme: 'https' },
    plugins: {
        // 화면을 상태바·내비게이션 바 아래까지 쓰고(edge-to-edge) 그 높이를 --safe-area-inset-* CSS 변수로 넘긴다.
        // LIGHT = 밝은 바탕 위 진한 아이콘. cover = index.html 의 viewport-fit 과 같은 값을 미리 알려 시작할 때 화면이 튀지 않게.
        SystemBars: { insetsHandling: 'css', style: 'LIGHT', initialViewportFitValueHint: 'cover' },
    },
}

export default config
