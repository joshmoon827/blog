'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { imageFilesFromDataTransfer } from '@/components/CoverReferencePhotos'
import SeriesCards from '@/components/SeriesCards'
import { useAuth } from '@/hooks/useAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { DEFAULT_SERIES_COVERS, type SeriesListLayout } from '@/lib/series'
import type { SeriesCardItem } from '@/lib/seriesItems'
import styles from './page.module.css'

type ArticleOption = {
  slug: string
  title: string
}

type Props = {
  items: SeriesCardItem[]
  initialLayout: SeriesListLayout
  articles: ArticleOption[]
}

const DEFAULT_COVER = DEFAULT_SERIES_COVERS.cloud

export default function SeriesListAdmin({
  items: initialItems,
  initialLayout,
  articles,
}: Props) {
  const router = useRouter()
  const { authenticated } = useAuth()
  const canEdit = authenticated && isAuthoringEnabled()
  const fileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState(initialItems)
  const [layout, setLayout] = useState(initialLayout)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newSlugs, setNewSlugs] = useState<string[]>([])
  const [addSlug, setAddSlug] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const coverPreviewRef = useRef<string | null>(null)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])
  useEffect(() => {
    setLayout(initialLayout)
  }, [initialLayout])

  useEffect(() => {
    coverPreviewRef.current = coverPreview
  }, [coverPreview])

  useEffect(() => {
    return () => {
      if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current)
    }
  }, [])

  const applyCoverFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current)
    const url = URL.createObjectURL(file)
    coverPreviewRef.current = url
    setCoverFile(file)
    setCoverPreview(url)
  }

  useEffect(() => {
    if (!creating || saving) return
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFilesFromDataTransfer(e.clipboardData)[0]
      if (!file) return
      e.preventDefault()
      applyCoverFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [creating, saving])

  const bySlug = useMemo(() => {
    const m = new Map<string, ArticleOption>()
    for (const a of articles) m.set(a.slug, a)
    return m
  }, [articles])

  const memberArticles = useMemo(
    () =>
      newSlugs
        .map((slug) => bySlug.get(slug))
        .filter((a): a is ArticleOption => Boolean(a)),
    [newSlugs, bySlug],
  )

  const availableToAdd = useMemo(
    () => articles.filter((a) => !newSlugs.includes(a.slug)),
    [articles, newSlugs],
  )

  const resetCreate = () => {
    setNewTitle('')
    setNewSlugs([])
    setAddSlug('')
    setCoverFile(null)
    if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current)
    coverPreviewRef.current = null
    setCoverPreview(null)
  }

  const persist = async (nextLayout: SeriesListLayout, nextItems: SeriesCardItem[]) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/category', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: nextLayout,
          order: nextItems.map((i) => i.slug).filter(Boolean),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setMessage('저장됨')
      router.refresh()
      setTimeout(() => setMessage(null), 1800)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const createSeries = async () => {
    const title = newTitle.trim()
    if (!title) {
      setMessage('제목을 입력하세요')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.set('title', title)
      fd.set('articleSlugs', JSON.stringify(newSlugs))
      if (coverFile) fd.set('file', coverFile)
      const res = await fetch('/api/category', { method: 'POST', body: fd })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || '추가 실패')
      resetCreate()
      setCreating(false)
      setMessage('카테고리를 추가했습니다')
      router.refresh()
      setTimeout(() => setMessage(null), 1800)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const setColumns = (columns: 1 | 2 | 3) => {
    const next = { ...layout, columns }
    setLayout(next)
    void persist(next, items)
  }

  const toggleFeatured = () => {
    const next = { ...layout, featuredFirst: !layout.featuredFirst }
    setLayout(next)
    void persist(next, items)
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    const tmp = next[index]!
    next[index] = next[j]!
    next[j] = tmp
    setItems(next)
    void persist(layout, next)
  }

  const moveMember = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= newSlugs.length) return
    setNewSlugs((prev) => {
      const next = prev.slice()
      const tmp = next[index]!
      next[index] = next[j]!
      next[j] = tmp
      return next
    })
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroRow}>
          <h1>Category</h1>
          {canEdit ? (
            <button
              type="button"
              className={`${styles.settingsBtn}${open ? ` ${styles.settingsBtnOn}` : ''}`}
              aria-label="카테고리 리스트 설정"
              aria-expanded={open}
              title="카테고리 그리드 · 순서"
              onClick={() => setOpen((v) => !v)}
            >
              <SettingsIcon />
            </button>
          ) : null}
        </div>
        <p>
          관련 아티클을 모은 폴더입니다. 클라우드 · 오픈소스 · AI 세 갈래로
          나뉩니다.
        </p>
      </section>

      {canEdit && open ? (
        <section className={styles.adminPanel} aria-label="카테고리 리스트 설정">
          <div className={styles.adminHead}>
            <h2>리스트 레이아웃</h2>
            {message ? <span className={styles.adminToast}>{message}</span> : null}
          </div>

          <div className={styles.adminBlock}>
            <p className={styles.adminLabel}>한 줄에 몇 개 (최대 3)</p>
            <div className={styles.colPicker} role="group" aria-label="열 개수">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.colBtn}${layout.columns === n ? ` ${styles.colBtnOn}` : ''}`}
                  aria-pressed={layout.columns === n}
                  disabled={saving}
                  onClick={() => setColumns(n)}
                >
                  <span className={styles.colPreview} data-cols={n} aria-hidden>
                    {Array.from({ length: n }, (_, i) => (
                      <span key={i} />
                    ))}
                  </span>
                  {n}열
                </button>
              ))}
            </div>
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={layout.featuredFirst}
              disabled={saving || layout.columns === 1}
              onChange={() => toggleFeatured()}
            />
            <span>첫 번째 카드를 한 줄 전체로 (예전 1+2 레이아웃)</span>
          </label>

          <div className={styles.adminBlock}>
            <p className={styles.adminLabel}>순서</p>
            <ul className={styles.orderList}>
              {items.map((item, i) => (
                <li key={item.slug || item.href} className={styles.orderItem}>
                  <span className={styles.orderTitle}>{item.title}</span>
                  <span className={styles.orderActions}>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      disabled={saving || i === 0}
                      aria-label="위로"
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      disabled={saving || i === items.length - 1}
                      aria-label="아래로"
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.adminBlock}>
            <div className={styles.createHead}>
              <p className={styles.adminLabel}>카테고리 추가</p>
              <button
                type="button"
                className={styles.createToggle}
                disabled={saving}
                onClick={() => {
                  setCreating((v) => {
                    if (v) resetCreate()
                    return !v
                  })
                }}
              >
                {creating ? '닫기' : '카테고리 추가'}
              </button>
            </div>

            {creating ? (
              <div className={styles.createForm}>
                <label className={styles.field}>
                  <span>제목</span>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={80}
                    placeholder="카테고리 이름"
                    disabled={saving}
                  />
                </label>

                <div className={styles.coverPick}>
                  <p className={styles.adminLabel}>사진</p>
                  <div className={styles.coverPreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPreview || DEFAULT_COVER} alt="" />
                  </div>
                  <p className={styles.coverHint}>
                    첨부하지 않으면 기본 표지를 씁니다. 클립보드 이미지를
                    붙여넣을 수도 있습니다.
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    hidden
                    onChange={(e) => {
                      applyCoverFile(e.target.files?.[0] ?? null)
                      e.target.value = ''
                    }}
                  />
                  <div className={styles.coverActions}>
                    <button
                      type="button"
                      className={styles.createToggle}
                      disabled={saving}
                      onClick={() => fileRef.current?.click()}
                    >
                      사진 첨부
                    </button>
                    {coverFile ? (
                      <button
                        type="button"
                        className={styles.orderBtnWide}
                        disabled={saving}
                        onClick={() => {
                          if (coverPreviewRef.current) {
                            URL.revokeObjectURL(coverPreviewRef.current)
                          }
                          coverPreviewRef.current = null
                          setCoverFile(null)
                          setCoverPreview(null)
                        }}
                      >
                        기본 표지로
                      </button>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className={styles.adminLabel}>
                    아티클 목록 ({memberArticles.length})
                  </p>
                  <ul className={styles.orderList}>
                    {memberArticles.map((article, i) => (
                      <li key={article.slug} className={styles.orderItem}>
                        <span className={styles.orderTitle}>{article.title}</span>
                        <span className={styles.orderActions}>
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
                            className={styles.orderBtnWide}
                            disabled={saving}
                            onClick={() =>
                              setNewSlugs((prev) =>
                                prev.filter((s) => s !== article.slug),
                              )
                            }
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
                      className={styles.createToggle}
                      disabled={saving || !addSlug}
                      onClick={() => {
                        if (!addSlug || newSlugs.includes(addSlug)) return
                        setNewSlugs((prev) => [...prev, addSlug])
                        setAddSlug('')
                      }}
                    >
                      추가
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.submitBtn}
                  disabled={saving || !newTitle.trim()}
                  onClick={() => void createSeries()}
                >
                  {saving ? '추가 중…' : '카테고리 만들기'}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <SeriesCards
        items={items}
        listLayout={layout}
        className={styles.seriesList}
      />
    </>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M19.4 13a7.7 7.7 0 0 0 .05-2l2.05-1.6-2-3.46-2.45 1a7.6 7.6 0 0 0-1.73-1L15 3h-6l-.32 2.94a7.6 7.6 0 0 0-1.73 1l-2.45-1-2 3.46L4.55 11a7.7 7.7 0 0 0 0 2l-2.05 1.6 2 3.46 2.45-1a7.6 7.6 0 0 0 1.73 1L9 21h6l.32-2.94a7.6 7.6 0 0 0 1.73-1l2.45 1 2-3.46L19.4 13Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}
