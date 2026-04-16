# Laws of UX Clone — 개발 로드맵

## 현재 브랜치 전략
```
main  ← 배포 안정본
 └── dev  ← 일반 개발
      └── feature/*  ← 기능별 브랜치
```

---

## ✅ 완료
- [x] Next.js 15 App Router 마이그레이션
- [x] 30개 bigcartel 포스터 이미지 다운로드 & 크롭 (상단 20%)
- [x] ImageCarousel: 5초 랜덤 crossfade 슬라이드
- [x] 페이지 전환 애니메이션 (Framer Motion fadeInUp/fadeOutUp)
- [x] 다크/라이트 모드 토글
- [x] git 브랜치 구조 (main / dev)

---

## 🚧 지금 할 것

### 1. 로컬 편집 서버 (`feature/local-editor`)
- [ ] `data/articles.local.json` — 아티클 내용 로컬 저장소
- [ ] `app/api/articles/route.ts` — GET(목록) / POST(저장) API route
- [ ] `app/api/articles/[slug]/route.ts` — GET(단건) / PUT(수정) / DELETE
- [ ] 아티클 상세 페이지에 편집 UI 추가
  - 제목 / 설명 / 본문 (Markdown) 인라인 편집
  - 저장 버튼 → API route → JSON 파일 갱신 → 카드에 반영
- [ ] 편집 모드는 `?edit=1` 쿼리 또는 `/edit` 라우트로 진입

### 2. Service Worker 오프라인 캐싱 (`feature/offline`)
- [ ] `public/sw.js` 작성 (Cache-First 전략)
  - 정적 에셋 (이미지, CSS, JS) 사전 캐시
  - API 응답 캐시 (아티클 목록 / 본문)
- [ ] `app/layout.tsx` 에서 SW 등록 (`navigator.serviceWorker.register`)
- [ ] 오프라인 상태 감지 → 토스트 배너 표시
- [ ] 편집 내용 오프라인 임시 저장 → 온라인 복귀 시 sync

### 3. 로그인 (추후 Lambda 연동 전 로컬 임시)
- [ ] 로컬: `localStorage` 기반 더미 세션 (이메일 + 패스워드 하드코딩)
- [ ] 편집 UI는 로그인 세션이 있어야만 노출
- [ ] 로그인 페이지 `/login`

---

## 🔜 나중에 할 것 (Lambda 연동)

### 인증
- [ ] AWS Lambda + API Gateway — `/auth/login`, `/auth/refresh`
- [ ] JWT 발급 → `httpOnly` 쿠키 저장
- [ ] Next.js Middleware 에서 토큰 검증 → 미인증시 `/login` 리다이렉트

### 문서 저장 서버
- [ ] Lambda + DynamoDB (또는 S3) — 아티클 CRUD
- [ ] API 엔드포인트를 로컬 API route 에서 Lambda URL 로 교체
  - 환경변수 `NEXT_PUBLIC_API_URL` 로 분기
  - 로컬: `http://localhost:3001/api`
  - 프로덕션: `https://xxx.lambda-url.ap-northeast-2.on.aws`

### Service Worker (프로덕션)
- [ ] Background Sync API — 오프라인 편집 내용을 온라인 복귀 시 Lambda로 전송
- [ ] Push Notification 연동 (선택)

---

## 🌐 웹 배포 시 변경사항

### 인프라
| 항목 | 로컬 | 프로덕션 |
|------|------|----------|
| API | Next.js API route (`/api/*`) | AWS Lambda + API Gateway |
| 인증 | localStorage 더미 세션 | JWT (Lambda) |
| 문서 저장 | `data/articles.local.json` (파일시스템) | DynamoDB / S3 |
| 이미지 | `public/images/` (정적) | S3 + CloudFront CDN |
| 호스팅 | `next dev` | Vercel or AWS Amplify |

### 코드 변경 포인트
- [ ] `lib/api.ts` — API URL 환경변수 분기 (`LOCAL_API` vs `LAMBDA_API`)
- [ ] `app/api/*` — 로컬에서만 활성화, 프로덕션은 Lambda proxy
- [ ] `next.config.ts` — `output: 'standalone'` 또는 Vercel adapter
- [ ] `public/sw.js` — 캐시 버전 관리 (배포마다 버전 bump)
- [ ] 이미지 경로 — `NEXT_PUBLIC_CDN_URL` 환경변수로 S3/CloudFront URL 교체
- [ ] CORS 설정 — Lambda에서 프론트 도메인 허용

### 환경변수 체계
```
# .env.local (로컬 전용, git 제외)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EDIT_SECRET=local-dev-secret   # 편집 권한 임시 비밀번호

# .env.production (프로덕션)
NEXT_PUBLIC_API_URL=https://xxx.execute-api.ap-northeast-2.amazonaws.com
NEXT_PUBLIC_CDN_URL=https://xxx.cloudfront.net
```

---

## 브랜치 → 배포 흐름 (목표)
```
feature/* → dev (PR + review)
               ↓
             main → Vercel / Amplify 자동 배포
```
