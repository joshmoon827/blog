import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  formatSupabaseError,
  isSupabaseConfigured,
  type DbComment,
} from '@/lib/supabase/client'
import {
  createLocalComment,
  listLocalComments,
  voteLocalComment,
} from '@/lib/localComments'

export type CommentsBackend = 'supabase' | 'local'

function allowLocalComments(): boolean {
  if (process.env.COMMENTS_LOCAL === '1') return true
  if (process.env.COMMENTS_LOCAL === '0') return false
  return process.env.NODE_ENV !== 'production'
}

export function resolveCommentsBackend(): CommentsBackend | null {
  if (isSupabaseConfigured()) return 'supabase'
  if (allowLocalComments()) return 'local'
  return null
}

function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isNetworkish(err: unknown): boolean {
  const msg = formatSupabaseError(err).toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('supabase에 연결') ||
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('network')
  )
}

export async function listComments(articleSlug: string): Promise<{
  comments: DbComment[]
  backend: CommentsBackend
}> {
  const backend = resolveCommentsBackend()
  if (!backend) {
    throw Object.assign(new Error('Comments backend is not configured'), {
      status: 503,
    })
  }

  if (backend === 'local') {
    return { comments: listLocalComments(articleSlug), backend }
  }

  try {
    const sb = getServerSupabase()
    const { data, error } = await sb
      .from('comments')
      .select('*')
      .eq('article_slug', articleSlug)
      .order('created_at', { ascending: true })
    if (error) throw error
    return { comments: (data || []) as DbComment[], backend: 'supabase' }
  } catch (err) {
    if (allowLocalComments() && isNetworkish(err)) {
      return { comments: listLocalComments(articleSlug), backend: 'local' }
    }
    throw Object.assign(new Error(formatSupabaseError(err)), { status: 502 })
  }
}

export async function createComment(input: {
  article_slug: string
  parent_id: string | null
  author: string
  body: string
}): Promise<{ comment: DbComment; backend: CommentsBackend }> {
  const backend = resolveCommentsBackend()
  if (!backend) {
    throw Object.assign(new Error('Comments backend is not configured'), {
      status: 503,
    })
  }

  if (backend === 'local') {
    return { comment: createLocalComment(input), backend }
  }

  try {
    const sb = getServerSupabase()
    const { data, error } = await sb
      .from('comments')
      .insert({
        article_slug: input.article_slug,
        parent_id: input.parent_id,
        author: input.author.trim().slice(0, 40),
        body: input.body.trim().slice(0, 4000),
      })
      .select('*')
      .single()
    if (error) throw error
    return { comment: data as DbComment, backend: 'supabase' }
  } catch (err) {
    if (allowLocalComments() && isNetworkish(err)) {
      return { comment: createLocalComment(input), backend: 'local' }
    }
    throw Object.assign(new Error(formatSupabaseError(err)), { status: 502 })
  }
}

export async function voteComment(
  id: string,
  direction: 'up' | 'down',
  voter: string,
): Promise<{ comment: DbComment; backend: CommentsBackend }> {
  const backend = resolveCommentsBackend()
  if (!backend) {
    throw Object.assign(new Error('Comments backend is not configured'), {
      status: 503,
    })
  }

  if (backend === 'local') {
    return { comment: voteLocalComment(id, direction, voter), backend }
  }

  try {
    const sb = getServerSupabase()
    const { data, error } = await sb.rpc('vote_comment', {
      p_id: id,
      p_direction: direction,
      p_voter: voter,
    })
    if (error) throw error
    return { comment: data as DbComment, backend: 'supabase' }
  } catch (err) {
    const msg = formatSupabaseError(err)
    if (allowLocalComments() && isNetworkish(err)) {
      return { comment: voteLocalComment(id, direction, voter), backend: 'local' }
    }
    const status =
      msg.includes('only the author') || msg.includes('cannot lower')
        ? 400
        : 502
    throw Object.assign(new Error(msg), { status })
  }
}
