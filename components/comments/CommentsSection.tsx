'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
  type DbComment,
} from '@/lib/supabase/client'
import { useLanguage } from '@/components/LocalizedText'
import JenyangAvatar from '@/components/jenyang/JenyangAvatar'
import { isLegacyJenyangAuthor, randomJenyangNickname } from '@/lib/jenyangNicknames'
import CommentComposer from './CommentComposer'
import jenyangStyles from '@/components/jenyang/jenyang.module.css'
import styles from './CommentsSection.module.css'

type NestedComment = DbComment & { replies: DbComment[] }
type CommentsBackend = 'supabase' | 'local'

type Props = {
  articleSlug: string
}

const AUTHOR_KEY = 'blog.comment.author'

function usePersistedJenyangAuthor() {
  const [author, setAuthor] = useState('')

  useEffect(() => {
    let next = ''
    try {
      const saved = localStorage.getItem(AUTHOR_KEY)
      if (saved && !isLegacyJenyangAuthor(saved)) {
        next = saved
      } else {
        next = randomJenyangNickname().displayName
      }
    } catch {
      next = randomJenyangNickname().displayName
    }
    setAuthor(next)
    try {
      if (next) localStorage.setItem(AUTHOR_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const setAuthorPersist = useCallback((name: string) => {
    setAuthor(name)
    try {
      if (name.trim()) localStorage.setItem(AUTHOR_KEY, name)
    } catch {
      /* ignore */
    }
  }, [])

  return [author, setAuthorPersist] as const
}

function nestComments(rows: DbComment[]): NestedComment[] {
  const roots = rows
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return roots.map((root) => ({
    ...root,
    replies: rows
      .filter((c) => c.parent_id === root.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }))
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 16).replace('T', ' ')
  }
}

async function apiJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init)
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export default function CommentsSection({ articleSlug }: Props) {
  const supabaseConfigured = isSupabaseConfigured()
  const language = useLanguage()
  const [rows, setRows] = useState<DbComment[]>([])
  const [backend, setBackend] = useState<CommentsBackend | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState('')
  const [author, setAuthorPersist] = usePersistedJenyangAuthor()
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [live, setLive] = useState(false)
  
  const t = {
    title: language === 'en' ? 'Comments' : '댓글',
    namePlaceholder: language === 'en' ? 'Name' : '이름',
    commentPlaceholder: language === 'en' ? 'Leave a comment' : '댓글을 남겨 주세요',
    submitButton: language === 'en' ? 'Post Comment' : '댓글 등록',
    submittingButton: language === 'en' ? 'Posting...' : '등록 중…',
    replyButton: language === 'en' ? 'Reply' : '답글',
    replySubmitButton: language === 'en' ? 'Post Reply' : '답글 등록',
    cancelButton: language === 'en' ? 'Cancel' : '취소',
    loading: language === 'en' ? 'Loading...' : '불러오는 중…',
    loadFailed: language === 'en' ? 'Failed to load comments.' : '댓글을 불러오지 못했습니다.',
    noComments: language === 'en' ? 'No comments yet. Be the first to comment.' : '아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.',
    upvote: language === 'en' ? 'Upvote' : '추천',
    downvote: language === 'en' ? 'Downvote' : '추천 내리기',
    hint: language === 'en' ? '⌘↵ Submit' : '⌘↵ 등록',
    local: language === 'en' ? 'Local' : '로컬',
    realtimeHint: language === 'en' ? 'Live updates' : '실시간 반영',
    localStorageHint: language === 'en' ? 'Local storage' : '로컬 저장',
    errorOwnCommentsOnly: language === 'en' ? 'You can only downvote your own comments.' : '본인 댓글만 추천을 내릴 수 있습니다.',
    errorCannotLowerOthersUpvotes: language === 'en' ? 'You cannot lower upvotes given by others.' : '남이 올려 둔 추천 수는 내릴 수 없습니다.',
  }

  const nested = useMemo(() => nestComments(rows), [rows])
  const total = rows.length

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const data = await apiJson<{
        comments: DbComment[]
        backend: CommentsBackend
      }>(`/api/comments?slug=${encodeURIComponent(articleSlug)}`, {
        cache: 'no-store',
      })
      setRows(data.comments || [])
      setBackend(data.backend)
      setUnavailable(false)
      setLoadFailed(false)
      setError('')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('백엔드가 없습니다') || message.includes('503')) {
        setUnavailable(true)
        setLoadFailed(false)
      } else {
        setLoadFailed(true)
        setError(message)
      }
      return false
    }
  }, [articleSlug])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Supabase realtime when that backend is active
  useEffect(() => {
    if (backend !== 'supabase' || loadFailed || loading || !supabaseConfigured) {
      return
    }
    const sb = getSupabaseBrowser()
    if (!sb) return

    const channel = sb
      .channel(`comments:${articleSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `article_slug=eq.${articleSlug}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED')
      })

    return () => {
      void sb.removeChannel(channel)
      setLive(false)
    }
  }, [articleSlug, refresh, loadFailed, loading, backend, supabaseConfigured])

  // Local backend: light polling instead of realtime
  useEffect(() => {
    if (backend !== 'local' || loadFailed || loading) return
    setLive(true)
    const t = window.setInterval(() => {
      void refresh()
    }, 5000)
    return () => {
      window.clearInterval(t)
      setLive(false)
    }
  }, [backend, loadFailed, loading, refresh])

  const submit = async (parentId: string | null, text: string) => {
    const name = author.trim()
    const content = text.trim()
    if (!name || !content) {
      setError('이름과 내용을 입력하세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      localStorage.setItem(AUTHOR_KEY, name)
    } catch {
      /* ignore */
    }
    try {
      await apiJson('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleSlug,
          parentId,
          author: name,
          body: content,
        }),
      })
      if (parentId) {
        setReplyTo(null)
        setReplyBody('')
      } else {
        setBody('')
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitRoot = async (e: FormEvent) => {
    e.preventDefault()
    await submit(null, body)
  }

  const onCmdEnter =
    (action: () => void) => (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return
      e.preventDefault()
      if (submitting) return
      action()
    }

  const myName = author.trim()

  const vote = async (id: string, direction: 'up' | 'down') => {
    const target = rows.find((c) => c.id === id)
    if (!target) return
    const isAuthor = Boolean(myName && myName === target.author)
    if (direction === 'down') {
      if (!isAuthor) {
        setError(t.errorOwnCommentsOnly)
        return
      }
      if (target.upvotes <= (target.score_floor ?? 0)) {
        setError(t.errorCannotLowerOthersUpvotes)
        return
      }
    }
    try {
      await apiJson('/api/comments/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, direction, voter: myName }),
      })
      setError('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const scoreOf = (c: DbComment) => c.upvotes
  const canLower = (c: DbComment) =>
    Boolean(myName && myName === c.author && c.upvotes > (c.score_floor ?? 0))

  if (unavailable && !loading) {
    return (
      <section className={styles.section} aria-label="댓글 설정 안내">
        <div className={styles.header}>
          <h2 className={styles.title}>댓글</h2>
        </div>
        <p className={styles.setup}>
          배포 환경에서는 Supabase가 필요합니다. Dashboard에서 활성 프로젝트의{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> /{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 설정하고{' '}
          <code>supabase/schema.sql</code>을 실행하세요. (
          <code>docs/comments-supabase.md</code>)
        </p>
      </section>
    )
  }

  return (
    <section className={styles.section} aria-label={t.title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t.title} {total > 0 ? total : ''}</h2>
        <div className={styles.meta}>
          {live && (
            <span className={styles.live}>
              <span className={styles.liveDot} aria-hidden />
              Live
            </span>
          )}
          <span>
            {backend === 'local' ? t.local : backend === 'supabase' ? 'Supabase' : ''}
          </span>
        </div>
      </div>

      <CommentComposer
        body={body}
        author={author}
        submitting={submitting}
        error={error}
        labels={{
          commentPlaceholder: t.commentPlaceholder,
          namePlaceholder: t.namePlaceholder,
          submitButton: t.submitButton,
          submittingButton: t.submittingButton,
        }}
        onBodyChange={setBody}
        onAuthorChange={setAuthorPersist}
        onSubmit={onSubmitRoot}
        onCmdEnter={onCmdEnter(() => {
          void submit(null, body)
        })}
      />

      {loading ? (
        <p className={styles.empty}>{t.loading}</p>
      ) : loadFailed ? (
        <p className={styles.empty}>
          {t.loadFailed}
          {error ? ` ${error}` : ''}
        </p>
      ) : nested.length === 0 ? (
        <p className={styles.empty}>{t.noComments}</p>
      ) : (
        <div className={styles.list}>
          {nested.map((c) => (
            <article key={c.id} className={styles.item}>
              <div className={styles.itemMeta}>
                <JenyangAvatar
                  name={c.author}
                  size={28}
                  className={jenyangStyles.commentAvatar}
                />
                <span className={styles.author}>{c.author}</span>
                <time className={styles.time} dateTime={c.created_at}>
                  {formatTime(c.created_at)}
                </time>
              </div>
              <p className={styles.body}>{c.body}</p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.voteBtn}
                  onClick={() => vote(c.id, 'up')}
                  aria-label={t.upvote}
                >
                  ▲
                </button>
                <span className={styles.score}>{scoreOf(c)}</span>
                <button
                  type="button"
                  className={styles.voteBtn}
                  onClick={() => vote(c.id, 'down')}
                  aria-label={t.downvote}
                  disabled={!canLower(c)}
                  title={
                    myName && myName === c.author
                      ? canLower(c)
                        ? t.downvote
                        : t.errorCannotLowerOthersUpvotes
                      : t.errorOwnCommentsOnly
                  }
                >
                  ▼
                </button>
                <button
                  type="button"
                  className={styles.replyBtn}
                  onClick={() => {
                    setReplyTo((prev) => (prev === c.id ? null : c.id))
                    setReplyBody('')
                  }}
                >
                  {t.replyButton}
                </button>
              </div>

              {replyTo === c.id && (
                <div className={styles.replyForm}>
                  <textarea
                    className={styles.textarea}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={onCmdEnter(() => {
                      void submit(c.id, replyBody)
                    })}
                    placeholder={`${c.author}님에게 답글`}
                    maxLength={4000}
                    disabled={submitting}
                  />
                  <div className={styles.replyActions}>
                    <button
                      type="button"
                      className={styles.cancel}
                      onClick={() => setReplyTo(null)}
                    >
                      {t.cancelButton}
                    </button>
                    <button
                      type="button"
                      className={styles.submit}
                      disabled={submitting}
                      onClick={() => submit(c.id, replyBody)}
                    >
                      {t.replySubmitButton}
                    </button>
                  </div>
                </div>
              )}

              {c.replies.length > 0 && (
                <div className={styles.replies}>
                  {c.replies.map((r) => (
                    <article key={r.id} className={styles.item}>
                      <div className={styles.itemMeta}>
                        <JenyangAvatar
                          name={r.author}
                          size={24}
                          className={jenyangStyles.commentAvatar}
                        />
                        <span className={styles.author}>{r.author}</span>
                        <time className={styles.time} dateTime={r.created_at}>
                          {formatTime(r.created_at)}
                        </time>
                      </div>
                      <p className={styles.body}>{r.body}</p>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.voteBtn}
                          onClick={() => vote(r.id, 'up')}
                          aria-label={t.upvote}
                        >
                          ▲
                        </button>
                        <span className={styles.score}>{scoreOf(r)}</span>
                        <button
                          type="button"
                          className={styles.voteBtn}
                          onClick={() => vote(r.id, 'down')}
                          aria-label={t.downvote}
                          disabled={!canLower(r)}
                          title={
                            myName && myName === r.author
                              ? canLower(r)
                                ? t.downvote
                                : t.errorCannotLowerOthersUpvotes
                              : t.errorOwnCommentsOnly
                          }
                        >
                          ▼
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
