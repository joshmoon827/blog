# 댓글 (내부 UI + Supabase)

LiveRe/Disqus 같은 외부 위젯이 아닙니다.  
블로그에 만든 댓글 UI가 Supabase `comments` 테이블에 읽고/씁니다.

## 설정

1. [supabase.com](https://supabase.com) 프로젝트 생성 (**활성** 상태 — 삭제된 ref는 DNS NXDOMAIN)
2. **Project Settings → API**에서 URL / `anon` `public` key 복사  
3. SQL Editor에서 [`supabase/schema.sql`](../supabase/schema.sql) 실행  
4. `.env.local` (앱이 읽는 값은 이 두 개뿐):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

5. 검증 후 재시작:

```bash
npm run check:supabase
npm run dev
```

→ 아티클 본문 아래 댓글

## 동작

| 기능 | 설명 |
|------|------|
| 작성 | 이름 + 본문 → `comments` insert |
| 답글 | `parent_id`로 1단 스레드 |
| 추천 | 누구나 ▲ 가능. 남이 올리면 `score_floor`로 잠김 |
| 추천 내리기 | 본인 댓글만 ▼, floor 아래로는 불가 (`vote_comment` RPC) |
| Live | Supabase Realtime으로 새로고침 없이 반영 |

## 트러블슈팅

| 증상 | 원인 | 조치 |
|------|------|------|
| UI에 “Supabase에 연결할 수 없습니다” / `Failed to fetch` | `NEXT_PUBLIC_SUPABASE_URL` 호스트가 DNS에 없음 (프로젝트 삭제·잘못된 ref) 또는 네트워크 차단 | Dashboard에서 **활성** 프로젝트의 URL / anon key로 `.env.local`을 고치고 `npm run check:supabase` → `next dev` 재시작 |
| 설정 안내만 보임 (폼 없음) | env 비어 있음 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 |
| RLS / relation “comments” 오류 | `schema.sql` 미실행 | SQL Editor에서 `supabase/schema.sql` 실행 |
| Live 배지 없음 | Realtime publication 미등록 | schema의 `supabase_realtime` 구문 재실행; Dashboard → Replication에서 `comments` 확인 |

로컬에서 URL 호스트만 빠르게 확인:

```bash
npm run check:supabase
# 또는
dig +short "$(node -e "const fs=require('fs');const m=fs.readFileSync('.env.local','utf8').match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);console.log(new URL(m[1].trim()).hostname)")"
```

출력이 비어 있으면 해당 Supabase 프로젝트는 존재하지 않거나 DNS가 죽은 상태입니다.

## 로컬 Supabase CLI (`supabase start`)

이 머신에 Docker가 없으면 로컬 스택은 불가합니다. Docker가 있을 때만:

```bash
npx supabase init   # 최초 1회
npx supabase start
npx supabase status # API URL + anon key 출력
# schema 적용 예: npx supabase db reset 또는 SQL Editor 대신 psql/migration
```

`.env.local` 예 (로컬은 `http` 허용):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
```
