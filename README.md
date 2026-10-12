# 증액저축 계산기

목표금액까지 남은 금액을 **매달 같은 금액**으로 모을 때와 **매년 정해진 금액씩 늘려** 모을 때의 월 저축액을 계산하는 작은 데스크톱 앱입니다.

## 실행

`release/증액저축계산기.exe` 를 더블클릭하면 설치 없이 바로 열립니다(실행할 때마다 압축을 풀어서 뜨기까지 몇 초 걸릴 수 있습니다). 입력한 플랜은 `%APPDATA%\증액저축계산기` 에 저장되어 다시 열어도 남아 있습니다.

## 개발

```bash
npm install
npm run dev     # 브라우저에서 화면 개발
npm test        # 계산 로직 테스트
npm run app     # 빌드 후 Electron 창으로 확인
npm run build   # release/증액저축계산기.exe 갱신 (실행 중인 exe 는 먼저 닫기)
npm run shot -- .shots/out.png [seed.json]   # 빌드된 화면을 PNG 로 저장
```

## 안드로이드 앱

같은 화면을 Capacitor 로 감싼 안드로이드 앱(패키지 `kr.biblekang.stepupsavings`, 홈 화면 이름 "증액저축")도 만들 수 있습니다. JDK 21 과 Android SDK 36 이 필요합니다(환경변수 `JAVA_HOME`, `ANDROID_HOME`).

```bash
npm run android:apk            # 테스트용 release/증액저축-debug.apk
npm run android:release        # Play 업로드용 release/증액저축.aab + 직접 전달용 release/증액저축.apk (업로드 키 필요)
npm run icons                  # assets/icon.svg 로 모든 아이콘 다시 만들기
npm run store                  # Play 등록 이미지(store/) 다시 만들기
npm run shot -- --device all   # 휴대폰·폴드 11가지 화면 자동 검사
```

- 휴대폰에 설치: apk 파일을 휴대폰으로 옮겨 열고 "출처를 알 수 없는 앱 설치"를 허용합니다.
- Google Play 등록·출시 후 관리: `docs/play-store.md`

## 계산 규칙

- **남은 개월 수**: `현재날짜 < 그 달 월급날 ≤ 완료날짜` 인 달의 수. 월급날 전이면 이번 달 포함, 월급날 당일부터는 제외. 완료일이 그 달 월급날보다 이르면 마지막 달도 제외. 31일처럼 없는 날은 그 달 말일.
- **균등 저축**: `올림(차액 ÷ 남은 개월 수)`
- **증액 저축**: 현재날짜의 연도(남은 월급날이 없으면 다음 해)를 첫해로, 해마다 월 저축액이 연간 증액액만큼 늘어남. `Σ 그해 개월 수 × 그해 월 저축액 = 차액` 이 되도록 첫해 금액을 구하고 1원 단위 올림.

자세한 설계는 `docs/superpowers/specs/2026-10-12-step-up-savings-design.md` 참고.
