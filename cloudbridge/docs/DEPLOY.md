# 배포와 도메인 — bridge.metacint.com

목표: `metacint.com` 의 서브도메인 **bridge.metacint.com** 에 구름다리 휴게소를 올린다.
정적 사이트(HTML/CSS/JS)라 서버가 필요 없고, 아래 셋 중 어디든 올릴 수 있다.

## 방법 A. GitHub Pages (저장소에 워크플로 포함됨)

1. GitHub 저장소 → **Settings → Pages → Build and deployment → Source: GitHub Actions** 로 바꾼다.
2. `master` 에 `cloudbridge/` 변경이 머지되면 `.github/workflows/deploy-cloudbridge.yml` 이 자동으로 빌드·배포한다.
   (처음엔 Actions 탭에서 **Run workflow** 로 수동 실행해도 된다.)
3. 도메인 등록업체(metacint.com 을 산 곳)의 DNS 에 레코드 추가:

   | 종류 | 이름 | 값 |
   |---|---|---|
   | CNAME | `bridge` | `metachainart.github.io` |

4. **Settings → Pages → Custom domain** 에 `bridge.metacint.com` 입력 → DNS 검사 통과 후 **Enforce HTTPS** 체크.
   `cloudbridge/public/CNAME` 파일이 빌드 결과에 같이 올라가므로 재배포 때 도메인이 풀리지 않는다.

주의: 한 저장소는 Pages 사이트 하나만 가진다. 이 저장소(writing-skill)가 다른 용도로 Pages 를 쓰게 되면
`cloudbridge/` 를 별도 저장소(예: `metachainart/cloudbridge`)로 옮기는 게 깔끔하다. 워크플로는 그대로 쓰면 된다.

## 방법 B. Vercel

```
Root Directory: cloudbridge
Build Command:  npm run build
Output:         dist
```
Vercel 프로젝트 → Domains → `bridge.metacint.com` 추가 → 안내되는 CNAME(`cname.vercel-dns.com`)을 DNS 에 등록.

## 방법 C. Cloudflare Pages

metacint.com 의 네임서버가 Cloudflare 라면 가장 간단하다. Pages 프로젝트 생성(빌드 설정은 B 와 동일) →
Custom domains → `bridge.metacint.com` → DNS 레코드가 자동으로 잡힌다.

## 로컬 확인

```bash
cd cloudbridge && npm install && npm run build && npx vite preview --port 4173
```

## 다음 단계(백엔드)가 붙을 때

정적 호스팅은 그대로 두고, Supabase(Auth + Postgres + Storage + Realtime) 프로젝트를 하나 만들어
`src/store.js` 의 저장 함수들만 교체한다. 프런트 배포 방식은 바뀌지 않는다.
