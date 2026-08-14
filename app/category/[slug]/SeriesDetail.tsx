'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Article } from '@/data/articles'
import ArticleCoverBanner from '@/components/ArticleCoverBanner'
import { imageFilesFromDataTransfer } from '@/components/CoverReferencePhotos'
import { LocalizedArticleCount } from '@/components/LocalizedText'
import SeriesArticleList from '@/components/SeriesArticleList'
import { useAuth } from '@/hooks/useAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import type { SeriesRecord } from '@/lib/series'
import { DEFAULT_SERIES_COVERS } from '@/lib/series'
import styles from './series-detail.module.css'

type Props = {
  series: SeriesRecord
  articles: Article[]
  /** All listed articles — picker for add-to-series */
  allArticles: Article[]
}

const STOCK_COVERS = [
  DEFAULT_SERIES_COVERS.cloud,
  DEFAULT_SERIES_COVERS.opensource,
  DEFAULT_SERIES_COVERS.ai,
  '/images/psychology-of-design.jpg',
  '/images/von-restorff-effect.jpg',
  '/images/working-memory.jpg',
  '/images/familiar-vs-novel.jpg',
  '/images/uniform-connectedness.jpg',
]

export default function SeriesDetail({
  series: initial,
  articles,
  allArticles,
}: Props) {
  const router = useRouter()
  const { authenticated } = useAuth()
  const canEdit = authenticated && isAuthoringEnabled()
  const fileRef = useRef<HTMLInputElement>(null)

  const [series, setSeries] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [coverImage, setCoverImage] = useState(initial.coverImage)
  const [coverUrlDraft, setCoverUrlDraft] = useState('')
  const [memberSlugs, setMemberSlugs] = useState<string[]>(() =>
    articles.map((a) => a.slug),
  )
  const [addSlug, setAddSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [coverPrompt, setCoverPrompt] = useState('')
  const [coverStatus, setCoverStatus] = useState<
    'idle' | 'running' | 'success' | 'error' | 'cancelled'
  >('idle')
  const [coverMessage, setCoverMessage] = useState('')
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    setSeries(initial)
  }, [initial])

  const bySlug = useMemo(() => {
    const m = new Map<string, Article>()
    for (const a of allArticles) m.set(a.slug, a)
    for (const a of articles) m.set(a.slug, a)
    return m
  }, [allArticles, articles])

  const memberArticles = useMemo(
    () =>
      memberSlugs
        .map((slug) => bySlug.get(slug))
        .filter((a): a is Article => Boolean(a)),
    [memberSlugs, bySlug],
  )

  const availableToAdd = useMemo(
    () => allArticles.filter((a) => !memberSlugs.includes(a.slug)),
    [allArticles, memberSlugs],
  )

  const displayArticles = editing ? memberArticles : articles

  const openEdit = () => {
    setTitle(series.title)
    setDescription(series.description)
    setCoverImage(series.coverImage)
    setCoverUrlDraft('')
    setMemberSlugs(
      Array.isArray(series.articleSlugs)
        ? series.articleSlugs.filter((s) => bySlug.has(s))
        : articles.map((a) => a.slug),
    )
    setAddSlug('')
    setMessage(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setMessage(null)
  }

  const persist = useCallback(
    async (patch: Partial<SeriesRecord> | FormData) => {
      setSaving(true)
      setMessage(null)
      try {
        const res =
          patch instanceof FormData
            ? await fetch(`/api/category/${series.slug}`, {
                method: 'PATCH',
                body: patch,
              })
            : await fetch(`/api/category/${series.slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
              })
        const data = (await res.json()) as {
          series?: SeriesRecord
          error?: string
        }
        if (!res.ok || !data.series) {
          throw new Error(data.error || '저장 실패')
        }
        setSeries(data.series)
        setTitle(data.series.title)
        setDescription(data.series.description)
        setCoverImage(data.series.coverImage)
        if (Array.isArray(data.series.articleSlugs)) {
          setMemberSlugs(data.series.articleSlugs.slice())
        }
        router.refresh()
        return true
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e))
        return false
      } finally {
        setSaving(false)
      }
    },
    [router, series.slug],
  )

  const stopCoverPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const applyCoverFromJob = useCallback(
    (image: string | null | undefined) => {
      if (!image) return
      setCoverImage(image)
      setSeries((cur) => ({ ...cur, coverImage: image }))
    },
    [],
  )

  const pollCoverJob = useCallback(async () => {
    const res = await fetch(
      `/api/generate-cover?slug=${encodeURIComponent(series.slug)}&target=category`,
      { cache: 'no-store' },
    )
    const data = (await res.json()) as {
      status?: string
      image?: string | null
      publicUrl?: string | null
      error?: string | null
    }
    const status = data.status || 'idle'
    if (status === 'success') {
      stopCoverPoll()
      setCoverStatus('success')
      setCoverMessage('표지 생성 완료')
      applyCoverFromJob(data.publicUrl || data.image)
      router.refresh()
    } else if (status === 'error' || status === 'cancelled') {
      stopCoverPoll()
      setCoverStatus(status)
      setCoverMessage(data.error || (status === 'cancelled' ? '취소됨' : '표지 생성 실패'))
    } else if (status === 'running') {
      setCoverStatus('running')
    }
  }, [applyCoverFromJob, router, series.slug, stopCoverPoll])

  const startCoverPoll = useCallback(() => {
    stopCoverPoll()
    void pollCoverJob()
    pollRef.current = window.setInterval(() => {
      void pollCoverJob()
    }, 2500)
  }, [pollCoverJob, stopCoverPoll])

  useEffect(() => {
    return () => stopCoverPoll()
  }, [stopCoverPoll])

  const generatingCover = coverStatus === 'running'

  const startCategoryCover = async () => {
    setCoverStatus('running')
    setCoverMessage('표지 생성을 백그라운드에서 시작합니다…')
    try {
      const res = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: series.slug,
          target: 'category',
          force: true,
          background: true,
          additionalPrompt: coverPrompt.trim() || undefined,
          cover:
            coverImage &&
            !coverImage.includes('/images/generated/') &&
            !coverImage.includes('/images/category/')
              ? coverImage
              : undefined,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || `시작 실패 (${res.status})`)
      setCoverMessage('표지 생성 중… (Cursor CLI + CDP Chrome)')
      startCoverPoll()
    } catch (e) {
      setCoverStatus('error')
      setCoverMessage(e instanceof Error ? e.message : '표지 생성 시작 실패')
    }
  }

  const cancelCategoryCover = async () => {
    try {
      await fetch(
        `/api/generate-cover?slug=${encodeURIComponent(series.slug)}&target=category`,
        { method: 'DELETE' },
      )
    } catch {
      /* ignore */
    }
    setCoverStatus('cancelled')
    setCoverMessage('표지 생성을 취소했습니다.')
    stopCoverPoll()
  }

  const saveMeta = async () => {
    const ok = await persist({
      title,
      description,
      coverImage,
      articleSlugs: memberSlugs,
    })
    if (ok) {
      setEditing(false)
      setMessage('저장됨')
      setTimeout(() => setMessage(null), 2000)
    }
  }

  const onPickFile = async (file: File | null) => {
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    const ok = await persist(fd)
    if (ok) setMessage('표지를 올렸습니다')
  }

  useEffect(() => {
    if (!editing || saving) return
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFilesFromDataTransfer(e.clipboardData)[0]
      if (!file) return
      e.preventDefault()
      void onPickFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [editing, saving, persist])

  const applyCoverUrl = async () => {
    const url = coverUrlDraft.trim()
    if (!url) return
    setCoverImage(url)
    const ok = await persist({ coverImage: url })
    if (ok) {
      setCoverUrlDraft('')
      setMessage('표지 URL 적용')
    }
  }

  const moveMember = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= memberSlugs.length) return
    setMemberSlugs((prev) => {
      const next = prev.slice()
      const tmp = next[index]!
      next[index] = next[j]!
      next[j] = tmp
      return next
    })
  }

  const removeMember = (slug: string) => {
    setMemberSlugs((prev) => prev.filter((s) => s !== slug))
  }

  const addMember = () => {
    if (!addSlug || memberSlugs.includes(addSlug)) return
    setMemberSlugs((prev) => [...prev, addSlug])
    setAddSlug('')
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.cover}>
          <ArticleCoverBanner
            src={editing ? coverImage : series.coverImage}
            alt=""
            priority
            fillParent
          />
          <div className={styles.coverScrim} />
          <div className={styles.coverMeta}>
            <p className={styles.eyebrow}>
              <Link href="/category">Category</Link>
              <span aria-hidden> / </span>
              <span>{series.slug}</span>
            </p>
            <h1>{editing ? title : series.title}</h1>
            <p className={styles.desc}>
              {editing ? description : series.description}
            </p>
            <p className={styles.count}>
              <LocalizedArticleCount count={displayArticles.length} />
            </p>
          </div>
        </div>

        {canEdit ? (
          <div className={styles.toolbar}>
            {!editing ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={openEdit}
              >
                수정
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => void saveMeta()}
                  disabled={saving}
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
              </>
            )}
            {message ? <span className={styles.toast}>{message}</span> : null}
          </div>
        ) : null}
      </section>

      {canEdit && editing ? (
        <section className={styles.editor} aria-label="카테고리 수정">
          <h2 className={styles.editorTitle}>카테고리 수정</h2>
          <p className={styles.editorHint}>
            표지·아티클 구성은 저장 시 반영됩니다. 아티클을 직접 고르면 태그
            자동 매칭 대신 이 목록·순서가 사용됩니다.
          </p>

          <label className={styles.field}>
            <span>제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </label>
          <label className={styles.field}>
            <span>설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={400}
            />
          </label>

          <div className={styles.coverBlock}>
            <p className={styles.coverBlockTitle}>표지 이미지</p>
            <div className={styles.coverPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="" />
            </div>
            <div className={styles.coverActions}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  void onPickFile(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={saving}
                onClick={() => fileRef.current?.click()}
              >
                사진 업로드
              </button>
              <div className={styles.urlRow}>
                <input
                  type="text"
                  placeholder="/images/category/… 또는 https://…"
                  value={coverUrlDraft}
                  onChange={(e) => setCoverUrlDraft(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.btn}
                  disabled={saving || !coverUrlDraft.trim()}
                  onClick={() => void applyCoverUrl()}
                >
                  URL 적용
                </button>
              </div>
              <label className={styles.field}>
                <span>표지 생성 추가 프롬프트 (선택)</span>
                <textarea
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  rows={2}
                  placeholder="카테고리 분위기·키워드를 표지 생성에 반영"
                  disabled={saving || generatingCover}
                />
              </label>
              <div className={styles.coverGenRow}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={saving || generatingCover}
                  onClick={() => void startCategoryCover()}
                >
                  {generatingCover ? '표지 생성 중…' : '표지 생성'}
                </button>
                {generatingCover ? (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={saving}
                    onClick={() => void cancelCategoryCover()}
                  >
                    생성 취소
                  </button>
                ) : null}
              </div>
              {coverMessage ? (
                <p className={styles.coverGenStatus} role="status">
                  {coverMessage}
                </p>
              ) : null}
            </div>
            <p className={styles.stockLabel}>테스트용 기본 표지</p>
            <div className={styles.stockGrid}>
              {STOCK_COVERS.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`${styles.stockThumb}${coverImage === src ? ` ${styles.stockThumbOn}` : ''}`}
                  onClick={() => setCoverImage(src)}
                  disabled={saving}
                  title={src}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.articlesBlock}>
            <p className={styles.coverBlockTitle}>
              아티클 목록 · 순서 ({memberSlugs.length})
            </p>
            <ul className={styles.memberList}>
              {memberArticles.map((article, i) => (
                <li key={article.slug} className={styles.memberItem}>
                  <span className={styles.memberIndex}>{i + 1}</span>
                  <span className={styles.memberTitle}>{article.title}</span>
                  <span className={styles.memberActions}>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      disabled={saving || i === 0}
                      aria-label="위로"
                      onClick={() => moveMember(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      disabled={saving || i === memberArticles.length - 1}
                      aria-label="아래로"
                      onClick={() => moveMember(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      disabled={saving}
                      aria-label="제거"
                      onClick={() => removeMember(article.slug)}
                    >
                      제거
                    </button>
                  </span>
                </li>
              ))}
              {!memberArticles.length ? (
                <li className={styles.memberEmpty}>담긴 아티클이 없습니다.</li>
              ) : null}
            </ul>

            <div className={styles.addRow}>
              <select
                value={addSlug}
                onChange={(e) => setAddSlug(e.target.value)}
                disabled={saving || !availableToAdd.length}
                aria-label="추가할 아티클"
              >
                <option value="">
                  {availableToAdd.length
                    ? '아티클 선택…'
                    : '추가할 아티클 없음'}
                </option>
                {availableToAdd.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={saving || !addSlug}
                onClick={addMember}
              >
                추가
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.listSection} aria-label="카테고리 아티클">
        {displayArticles.length ? (
          <SeriesArticleList articles={displayArticles} />
        ) : (
          <p className={styles.empty}>
            이 카테고리에 연결된 아티클이 없습니다.
            {editing
              ? ' 위에서 아티클을 추가하세요.'
              : ` 태그(${series.matchTags.slice(0, 6).join(', ')})로 매칭되거나, 수정에서 직접 담을 수 있습니다.`}
          </p>
        )}
      </section>
    </>
  )
}
