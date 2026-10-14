# 실시간 교통 데이터 후보 · 2026-10-14 확인

| 제공처 | 활용 데이터 | 연동 조건·한계 | 공식 링크 |
|---|---|---|---|
| 국토교통부 ITS | 도로 구간 속도·통행시간 | 인증키 필요. 현재 구현된 어댑터. 김해 관측 링크 커버리지와 최신 응답 확인 필요 | https://www.data.go.kr/data/15040463/openapi.do |
| 경찰청 UTIC | 전국 도심 소통정보·표준노드링크 | 발급 키 + IP 인증. 일반 GitHub 러너의 유동 IP보다 고정 IP 서버가 적합 | https://www.data.go.kr/data/15087120/openapi.do |
| 한국도로공사 | 고속도로 실시간 소통 | 고속도로 대상. 김해 생활권 골목 도로를 대체하지 않음. 활용 인증·필드 확인 필요 | https://www.data.go.kr/data/15076684/openapi.do |
| 국토교통부 TAGO | 노선별 운행 버스 위치 | 버스위치정보 API는 15098533. 도시코드 목록에서 김해 지원 확인 후 노선별 조회. 인증키 필요 | https://www.data.go.kr/data/15098533/openapi.do |
| 국토교통부 TAGO | 버스 도착 예상정보 | 도착예측과 도로 속도는 다른 지표. 김해 지원 정류소 확인 필요 | https://www.data.go.kr/data/15098530/openapi.do |
| 김해 교통정보센터 | 소통·CCTV·돌발·버스 화면 | 공식 서비스 존재 확인. 외부 공개 API 명세·재이용 조건은 확인하지 못함. 내부 URL을 임의로 API 취급하지 않음 | https://its.gimhae.go.kr/ |

UTIC는 신청 목적 사용 및 출처 표기 조건을 명시합니다: https://www.utic.go.kr/guide/newUtisDataWrite.do

현재 직접 연동 코드는 ITS만 구현되었습니다. 나머지는 검증된 서비스 후보이며 아직 어댑터를 구현하지 않았습니다. API 키 없이 실제 응답, 관측 범위, 지연과 결측률은 검증할 수 없습니다. 김해 생활권 데이터는 ITS와 UTIC를 우선 비교하고 고속도로·버스 정보를 보완하는 구성이 적합합니다.

## 배포 구조

Actions secret → 공식 ITS 요청 → 허용 필드만 JSON으로 추출 → Pages 배포 → 브라우저 조회. 키·요청 URL·예외 문자열은 공개 JSON에 포함하지 않습니다. 15분 주기 스냅샷은 초 단위 실시간이 아닙니다. 수집 지연·노후 데이터는 화면에서 구분합니다.

GitHub schedule은 지연·누락 가능하며 공개 저장소는 60일 활동 부재 시 예약 작업이 비활성화될 수 있습니다: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
