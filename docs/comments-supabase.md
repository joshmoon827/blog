# 댓글 (내부 UI)

블로그 댓글 UI는 `/api/comments`를 통해 저장합니다.

## 백엔드 선택

| 환경 | 동작 |
|------|------|
| `next dev` + Supabase env 없음 | `data/comments.local.json` (로컬) |
| Supabase URL·anon key 설정됨 | Supabase `comments` 테이블 + Realtime |
| 프로덕션 + Supabase 없음 | 설정 안내만 표시 |

Supabase가 설정돼 있어도 DNS/네트워크로 죽으면, **개발 모드**에서는 자동으로 로컬 JSON으로 넘어갑니다.

## 로컬 (기본)

별도 설정 없이 `npm run dev`면 댓글이 동작합니다. 데이터는 `data/comments.local.json`에 쌓입니다.

강제 로컬: `COMMENTS_LOCAL=1`  
로컬 끄기: `COMMENTS_LOCAL=0`

## Supabase (배포·공유용)

1. [supabase.com](https://supabase.com) 프로젝트 생성 (**활성** 상태)
2. **Project Settings → API**에서 URL / `anon` key 복사
3. SQL Editor에서 [`supabase/schema.sql`](../supabase/schema.sql) 실행
4. `.env.local` (또는 Vercel env):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

5. 검증 후 재시작:

```bash
npm run check:supabase
npm run dev
```

## 동작

| 기능 | 설명 |
|------|------|
| 작성 | 이름 + 본문 |
| 답글 | `parent_id`로 1단 스레드 |
| 추천 | 누구나 ▲. 남이 올리면 `score_floor`로 잠김 |
| 추천 내리기 | 본인 댓글만 ▼, floor 아래 불가 |
| Live | Supabase Realtime / 로컬은 5초 폴링 |

## 트러블슈팅

| 증상 | 조치 |
|------|------|
| 긴 DNS 에러 + 등록 실패 | 죽은 Supabase URL이 남아 있음 → `.env.local`의 `NEXT_PUBLIC_SUPABASE_*`를 비우거나 활성 프로젝트로 교체 후 **next dev 재시작** |
| 배포에서 설정 안내만 | Vercel에 URL·anon key + `schema.sql` |
| RLS / relation “comments” | `schema.sql` 재실행 |
| Live 배지 없음 (Supabase) | Realtime publication에 `comments` 등록 |
