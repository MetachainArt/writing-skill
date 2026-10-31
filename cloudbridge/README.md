# 구름다리 휴게소 (Cloud Bridge Rest Stop)

먼저 떠난 반려동물을 위한 **알록달록한 온라인 추모 메타버스**.
구름 위 섬을 걸어 다니며 아이의 별을 밝히고, 꽃·간식·촛불을 놓고, 하늘 우체통에 편지를 부친다.
새 별을 만들면 아이가 빛의 문에서 무지개 구름다리를 건너 별빛 정원에 자리를 잡는 장면이 재생된다.

- 기획서: [`docs/PLAN.md`](docs/PLAN.md)
- 배포/도메인: [`docs/DEPLOY.md`](docs/DEPLOY.md)
- 목표 주소: **https://bridge.metacint.com**

## 실행

```bash
cd cloudbridge
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run preview  # 빌드 결과 미리보기
```

## 구조

```
cloudbridge/
├── index.html          # 입장 화면 + HUD 마크업
├── public/CNAME        # bridge.metacint.com (GitHub Pages 커스텀 도메인)
└── src/
    ├── main.js         # 부팅, 상호작용 루프, 별 만들기 흐름
    ├── world.js        # 섬·구름·무지개 다리·별·등불·꽃잎·낮밤 (three.js)
    ├── pets.js         # 종별 로우폴리 펫 아바타 + 거닐기/반기기 AI
    ├── player.js       # 방문자 아바타, WASD·조이스틱·카메라
    ├── ceremony.js     # 새 별 생성 시 구름다리 건너는 연출
    ├── ui.js           # 모달(별 만들기/추모 카드/편지/목록/라운지)
    ├── store.js        # 데이터 계층 (localStorage, 공유 링크 인코딩)
    ├── audio.js        # WebAudio 생성음 (외부 파일 없음)
    └── style.css
```

## 주요 기능
- 별 만들기 → 구름다리 건너는 세리머니 → 별빛 정원에 자리(번호 `1-07` 식, 무한 확장)
- 추모 카드: 사진 등록·교체, 꽃·분향·촛불·간식·쓰다듬기(월드에 실제로 쌓임), 편지, 공유, 같이 산책하기
- 산책: 아이가 따라오고(다리 끝까지), 서술형 캡션으로 반응
- 내 아이 바로 가기, 별 목록 검색(이름/번호), 아바타 꾸미기·이름표, 👋🙏💗 감정 표현
- 조약돌 탑(한 줄 새겨 올리기), 위로의 광장 게시판(답글 없이 토닥만), 하늘 우체통, 기억의 나무, 힐링 라운지
- 낮·노을·밤, 반딧불, 꽃잎, 등불, PWA(홈 화면에 추가)

## 조작

| 동작 | 데스크톱 | 모바일 |
|---|---|---|
| 이동 | WASD / 방향키 (Shift 달리기) | 왼쪽 조이스틱 |
| 시점 | 드래그, 휠 줌 | 드래그 |
| 살펴보기 | E / Enter 또는 버튼 | 버튼 |
| 닫기·연출 건너뛰기 | Esc | ✕ |

## 데이터

현재는 브라우저 `localStorage` 에만 저장된다(`cloudbridge.v1`).
공유 버튼은 별 하나를 URL 해시(`#m=...`)에 담아 백엔드 없이도 가족에게 보낼 수 있다.
계정·동기화·실시간 동시 접속은 `docs/PLAN.md` 의 2단계 로드맵 참고.
