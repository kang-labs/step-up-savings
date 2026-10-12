package kr.biblekang.stepupsavings;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 안드로이드 14 이하에서도 화면을 상태바·내비게이션 바 아래까지 쓴다(15 이상은 기본).
        // 그래야 상태바 뒤로 앱의 아이보리 헤더가 보이고, 회색 상태바에 진한 아이콘이 겹치지 않는다.
        // Capacitor 8 SystemBars 문서 권장 (Capacitor 9 부터는 자동).
        EdgeToEdge.enable(this);
    }
}
