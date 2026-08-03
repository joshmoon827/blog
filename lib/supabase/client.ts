import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type DbComment = {
  id: string
  article_slug: string
  parent_id: string | null
  author: string
  body: string
  upvotes: number
  downvotes: number
  /** Locked minimum score (raised when others upvote). */
  score_floor: number
  created_at: string
}

let browserClient: SupabaseClient | null = null

function envUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
}

function envAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
}

function isAllowedSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname) return false
    // Cloud projects require https. Local `supabase start` uses http://127.0.0.1:54321.
    if (parsed.protocol === 'https:') return true
    if (parsed.protocol === 'http:') {
      return (
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === 'localhost'
      )
    }
    return false
  } catch {
    return false
  }
}

/** True when both public env vars are non-empty and URL looks usable. */
export function isSupabaseConfigured(): boolean {
  const url = envUrl()
  const key = envAnonKey()
  if (!url || !key) return false
  return isAllowedSupabaseUrl(url)
}

/**
 * Map opaque network failures (DNS / paused / deleted project) to something
 * actionable. Other PostgREST / RLS messages pass through.
 */
export function formatSupabaseError(err: unknown): string {
  const raw =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : err instanceof Error
          ? err.message
          : String(err || 'Unknown error')

  const lower = raw.toLowerCase()
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    return (
      'Supabase에 연결할 수 없습니다. NEXT_PUBLIC_SUPABASE_URL 프로젝트가 ' +
      '삭제·일시정지되었거나 URL이 잘못된 경우 DNS/네트워크에서 실패합니다. ' +
      'Dashboard에서 활성 프로젝트의 URL·anon key를 .env.local에 넣고 ' +
      'supabase/schema.sql 실행 후 next dev를 재시작하세요. (docs/comments-supabase.md)'
    )
  }
  return raw
}

/** Browser (and client-component) Supabase client. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (browserClient) return browserClient
  browserClient = createClient(envUrl(), envAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return browserClient
}
