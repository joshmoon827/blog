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
  formatSupabaseError,
  getSupabaseBrowser,
  isSupabaseConfigured,
  type DbComment,
} from '@/lib/supabase/client'
import styles from './CommentsSection.module.css'

type NestedComment = DbComment & { replies: DbComment[] }

type Props = {
  articleSlug: string
}

const AUTHOR_KEY = 'blog.comment.author'

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

export default function CommentsSection({ articleSlug }: Props) {
  const configured = isSupabaseConfigured()
  const [rows, setRows] = useState<DbComment[]>([])
  const [loading, setLoading] = useState(configured)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState('')
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [live, setLive] = useState(false)

  const nested = useMemo(() => nestComments(rows), [rows])
  const total = rows.length

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_KEY)
      if (saved) setAuthor(saved)
    } catch {
      /* ignore */
    }
  }, [])

  const refresh = useCallback(async (): Promise<boolean> => {
    const sb = getSupabaseBrowser()
    if (!sb) return false
    try {
      const { data, error: qErr } = await sb
        .from('comments')
        .select('*')
        .eq('article_slug', articleSlug)
        .order('created_at', { ascending: true })
      if (qErr) {
        setLoadFailed(true)
        setError(formatSupabaseError(qErr))
        return false
      }
      setRows((data || []) as DbComment[])
      setLoadFailed(false)
      setError('')
      return true
    } catch (err) {
      setLoadFailed(true)
      setError(formatSupabaseError(err))
      return false
    }
  }, [articleSlug])

  useEffect(() => {
    if (!configured) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [configured, refresh])

  // Realtime live updates — only after a successful load (dead host → no WS spam)
  useEffect(() => {
    if (loadFailed || loading) return
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
  }, [articleSlug, refresh, loadFailed, loading])

  const submit = async (parentId: string | null, text: string) => {
    const sb = getSupabaseBrowser()
    if (!sb) return
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
      const { error: insErr } = await sb.from('comments').insert({
        article_slug: articleSlug,
        parent_id: parentId,
        author: name.slice(0, 40),
        body: content.slice(0, 4000),
      })
      if (insErr) {
        setError(formatSupabaseError(insErr))
        return
      }
      if (parentId) {
        setReplyTo(null)
        setReplyBody('')
      } else {
        setBody('')
      }
      await refresh()
    } catch (err) {
      setError(formatSupabaseError(err))
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
    const sb = getSupabaseBrowser()
    if (!sb) return
    const target = rows.find((c) => c.id === id)
    if (!target) return
    const isAuthor = Boolean(myName && myName === target.author)
    if (direction === 'down') {
      if (!isAuthor) {
        setError('본인 댓글만 추천을 내릴 수 있습니다.')
        return
      }
      if (target.upvotes <= (target.score_floor ?? 0)) {
        setError('남이 올려 둔 추천 수는 내릴 수 없습니다.')
        return
      }
    }
    try {
      const { error: vErr } = await sb.rpc('vote_comment', {
        p_id: id,
        p_direction: direction,
        p_voter: myName,
      })
      if (vErr) {
        const msg = formatSupabaseError(vErr)
        setError(
          msg.includes('only the author')
            ? '본인 댓글만 추천을 내릴 수 있습니다.'
            : msg.includes('cannot lower')
              ? '남이 올려 둔 추천 수는 내릴 수 없습니다.'
              : msg,
        )
        return
      }
      setError('')
      await refresh()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  const scoreOf = (c: DbComment) => c.upvotes
  const canLower = (c: DbComment) =>
    Boolean(myName && myName === c.author && c.upvotes > (c.score_floor ?? 0))

  if (!configured) {
    return (
      <section className={styles.section} aria-label="댓글 설정 안내">
        <div className={styles.header}>
          <h2 className={styles.title}>댓글</h2>
        </div>
        <p className={styles.setup}>
          Supabase 댓글: <code>.env.local</code>에{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 넣고{' '}
          <code>supabase/schema.sql</code>을 SQL Editor에서 실행한 뒤{' '}
          <code>next dev</code>를 재시작하세요.
        </p>
      </section>
    )
  }

  return (
    <section className={styles.section} aria-label="댓글">
      <div className={styles.header}>
        <h2 className={styles.title}>댓글 {total > 0 ? total : ''}</h2>
        <div className={styles.meta}>
          {live && (
            <span className={styles.live}>
              <span className={styles.liveDot} aria-hidden />
              Live
            </span>
          )}
          <span>Supabase</span>
        </div>
      </div>

      <form className={styles.form} onSubmit={onSubmitRoot}>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="이름"
            maxLength={40}
            required
            disabled={submitting}
            autoComplete="nickname"
          />
          <div />
        </div>
        <textarea
          className={styles.textarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onCmdEnter(() => {
            void submit(null, body)
          })}
          placeholder="댓글을 남겨 주세요"
          maxLength={4000}
          required
          disabled={submitting}
        />
        <div className={styles.formActions}>
          <span className={styles.hint}>⌘↵ 등록 · 실시간 반영</span>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? '등록 중…' : '댓글 등록'}
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>

      {loading ? (
        <p className={styles.empty}>불러오는 중…</p>
      ) : loadFailed ? (
        <p className={styles.empty}>
          댓글을 불러오지 못했습니다. URL 호스트 DNS가 죽으면 프로젝트가
          삭제된 경우가 많습니다 — Dashboard에서 활성 프로젝트 URL·anon key로{' '}
          <code>.env.local</code>을 고친 뒤 <code>npm run check:supabase</code>로
          확인하고 <code>next dev</code>를 재시작하세요.
        </p>
      ) : nested.length === 0 ? (
        <p className={styles.empty}>아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>
      ) : (
        <div className={styles.list}>
          {nested.map((c) => (
            <article key={c.id} className={styles.item}>
              <div className={styles.itemMeta}>
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
                  aria-label="추천"
                >
                  ▲
                </button>
                <span className={styles.score}>{scoreOf(c)}</span>
                <button
                  type="button"
                  className={styles.voteBtn}
                  onClick={() => vote(c.id, 'down')}
                  aria-label="추천 내리기"
                  disabled={!canLower(c)}
                  title={
                    myName && myName === c.author
                      ? canLower(c)
                        ? '추천 내리기'
                        : '남이 올려 둔 추천 수는 내릴 수 없습니다'
                      : '본인 댓글만 내릴 수 있습니다'
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
                  답글
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
                      취소
                    </button>
                    <button
                      type="button"
                      className={styles.submit}
                      disabled={submitting}
                      onClick={() => submit(c.id, replyBody)}
                    >
                      답글 등록
                    </button>
                  </div>
                </div>
              )}

              {c.replies.length > 0 && (
                <div className={styles.replies}>
                  {c.replies.map((r) => (
                    <article key={r.id} className={styles.item}>
                      <div className={styles.itemMeta}>
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
                          aria-label="추천"
                        >
                          ▲
                        </button>
                        <span className={styles.score}>{scoreOf(r)}</span>
                        <button
                          type="button"
                          className={styles.voteBtn}
                          onClick={() => vote(r.id, 'down')}
                          aria-label="추천 내리기"
                          disabled={!canLower(r)}
                          title={
                            myName && myName === r.author
                              ? canLower(r)
                                ? '추천 내리기'
                                : '남이 올려 둔 추천 수는 내릴 수 없습니다'
                              : '본인 댓글만 내릴 수 있습니다'
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
