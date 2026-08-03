'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { coverPickerImages, coverLabel, coverPalette } from '@/data/covers'
import CoverPaletteThumb from '@/components/CoverPaletteThumb'
import type { ArticleData } from '@/lib/localArticles'
import { renderArticleBody } from '@/lib/renderArticleBody'
import type { HybridMarkdownEditorHandle } from '@/components/HybridMarkdownEditor'
import {
  CoverReferencePhotos,
  coverRefsToPayload,
  revokeCoverReferencePhotos,
  type CoverReferencePhoto,
} from '@/components/CoverReferencePhotos'
import CoverBackgroundPicker from '@/components/CoverBackgroundPicker'
import ArticleCoverBanner from '@/components/ArticleCoverBanner'
import CommentsSection from '@/components/comments/CommentsSection'
import TistoryMoreLessHydrate from '@/components/TistoryMoreLessHydrate'
import {
  formatBodyClassName,
  resolveArticleFormat,
} from '@/data/articleFormats'
import { formatTagsInput, parseTagsInput } from '@/lib/parseFrontmatter'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { isLocalToolsEnabled } from '@/lib/isLocalTools'
import { useAuth } from '@/hooks/useAuth'
import styles from './page.module.css'

const HybridMarkdownEditor = dynamic(
  () =>
    import('@/components/HybridMarkdownEditor').then((mod) => ({
      default: mod.HybridMarkdownEditor,
    })),
  { ssr: false },
)

interface Props {
  article: ArticleData
}

type CoverJobStatus = 'idle' | 'running' | 'success' | 'error'

async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    body: form,
  })
  const data = (await res.json()) as { url?: string; error?: string }
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return data.url
}

type CoverJobMode = 'generate' | 'redownload'

type CoverGenOptions = {
  additionalPrompt?: string
  productRelated?: boolean
  paletteColors?: string[]
  backgroundColor?: string
  referenceImages?: Array<{
    filename: string
    contentType: string
    contentBase64: string
  }>
}

async function startCoverJob(
  slug: string,
  cover?: string | null,
  mode: CoverJobMode = 'generate',
  opts: CoverGenOptions = {},
) {
  const body: {
    slug: string
    force: boolean
    background: boolean
    mode: CoverJobMode
    cover?: string
    additionalPrompt?: string
    productRelated?: boolean
    paletteColors?: string[]
    backgroundColor?: string
    referenceImages?: CoverGenOptions['referenceImages']
  } = {
    slug,
    force: true,
    background: true,
    mode,
    productRelated: opts.productRelated !== false,
  }
  const extra = opts.additionalPrompt?.trim()
  if (extra) body.additionalPrompt = extra
  if (opts.paletteColors?.length) body.paletteColors = opts.paletteColors
  if (typeof opts.backgroundColor === 'string') {
    body.backgroundColor = opts.backgroundColor
  }
  if (opts.referenceImages?.length) body.referenceImages = opts.referenceImages
  // Never send a prior Gemini output as the style reference.
  if (cover && !cover.includes('/images/generated/') && !cover.includes('/generated/')) {
    body.cover = cover
  }
  const res = await fetch('/api/generate-cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { error?: string; started?: boolean }
  if (!res.ok) throw new Error(data.error || `Generate failed (${res.status})`)
  return data
}

async function fetchCoverStatus(slug: string) {
  const res = await fetch(`/api/generate-cover?slug=${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  const data = (await res.json()) as {
    status?: CoverJobStatus
    publicUrl?: string | null
    image?: string | null
    error?: string | null
    keywords?: string[] | null
    logo?: string | null
    job?: {
      mode?: CoverJobMode
      additionalPrompt?: string | null
      productRelated?: boolean | null
      backgroundColor?: string | null
    } | null
  }
  if (!res.ok) throw new Error('status fetch failed')
  return data
}

export default function ArticleView({ article: initial }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authenticated } = useAuth()
  const canEdit = authenticated && isAuthoringEnabled()
  const [article, setArticle] = useState(initial)
  const [coverEditing, setCoverEditing] = useState(false)
  const [bodyEditing, setBodyEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [coverStatus, setCoverStatus] = useState<CoverJobStatus>('idle')
  const [coverMessage, setCoverMessage] = useState('')
  const [bodyValue, setBodyValue] = useState(initial.body)
  const [createdValue, setCreatedValue] = useState(initial.created || '')
  const [descriptionValue, setDescriptionValue] = useState(initial.description || '')
  const [tagsValue, setTagsValue] = useState(formatTagsInput(initial.tags))
  const [imageValue, setImageValue] = useState(initial.image)
  const [coverAdditionalPrompt, setCoverAdditionalPrompt] = useState('')
  const [coverProductRelated, setCoverProductRelated] = useState(true)
  const [coverBackgroundColor, setCoverBackgroundColor] = useState('')
  const [coverReferencePhotos, setCoverReferencePhotos] = useState<
    CoverReferencePhoto[]
  >([])
  const draft = useRef({ ...initial })
  const bodyRef = useRef<HybridMarkdownEditorHandle>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => revokeCoverReferencePhotos(coverReferencePhotos)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke latest list on unmount
  }, [])

  const selectCover = (src: string) => {
    draft.current.image = src
    setImageValue(src)
  }

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const applyCoverSuccess = useCallback(
    (publicUrl: string, keywords?: string[] | null, logo?: string | null) => {
      const logoPart = logo ? ` · 로고: ${logo}` : ''
      console.log(
        `[cover] 표지 생성 완료${keywords?.length ? ` · ${keywords.join(', ')}` : ''}${logoPart} → ${publicUrl}`,
      )
      selectCover(publicUrl)
      setArticle((prev) => ({ ...prev, image: publicUrl }))
      setCoverStatus('success')
      setCoverMessage('')
      stopPolling()
      router.refresh()
    },
    [router, stopPolling],
  )

  const restoreCoverOptionsFromJob = useCallback(
    (job?: {
      additionalPrompt?: string | null
      productRelated?: boolean | null
      backgroundColor?: string | null
    } | null) => {
      if (!job) return
      const saved = typeof job.additionalPrompt === 'string' ? job.additionalPrompt : ''
      if (saved.trim()) {
        setCoverAdditionalPrompt((prev) => (prev.trim() ? prev : saved))
      }
      if (typeof job.productRelated === 'boolean') {
        setCoverProductRelated(job.productRelated)
      }
      if (typeof job.backgroundColor === 'string' && job.backgroundColor.trim()) {
        setCoverBackgroundColor((prev) => (prev.trim() ? prev : job.backgroundColor!.trim()))
      }
    },
    [],
  )

  const pollCoverStatus = useCallback(async () => {
    try {
      const data = await fetchCoverStatus(article.slug)
      restoreCoverOptionsFromJob(data.job)
      const status = (data.status || 'idle') as CoverJobStatus
      if (status === 'running') {
        setCoverStatus('running')
        setCoverMessage(
          data.job?.mode === 'redownload'
            ? 'Gemini 페이지에서 이미지 다시 다운로드 중…'
            : '표지 생성 중… (Cursor CLI + CDP Chrome)',
        )
        return
      }
      if (status === 'success' && data.publicUrl) {
        applyCoverSuccess(data.publicUrl, data.keywords, data.logo)
        return
      }
      if (status === 'error') {
        if (data.publicUrl) {
          selectCover(data.publicUrl)
          setArticle((prev) =>
            prev.image === data.publicUrl
              ? prev
              : { ...prev, image: data.publicUrl! },
          )
        }
        setCoverStatus('error')
        setCoverMessage(data.error || '표지 생성에 실패했습니다.')
        stopPolling()
        return
      }
      // idle with no job — stop if we were waiting
      if (status === 'idle' || status === 'success') {
        stopPolling()
      }
    } catch {
      /* keep polling */
    }
  }, [article.slug, applyCoverSuccess, restoreCoverOptionsFromJob, stopPolling])

  const startPolling = useCallback(() => {
    stopPolling()
    void pollCoverStatus()
    pollRef.current = setInterval(() => {
      void pollCoverStatus()
    }, 4000)
  }, [pollCoverStatus, stopPolling])

  useEffect(() => {
    if (!isLocalToolsEnabled()) return
    const wantGen = searchParams.get('coverGen') === '1'
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchCoverStatus(article.slug)
        if (cancelled) return
        restoreCoverOptionsFromJob(data.job)
        if (data.status === 'running' || wantGen) {
          setCoverStatus('running')
          setCoverMessage(
            data.job?.mode === 'redownload'
              ? 'Gemini 페이지에서 이미지 다시 다운로드 중…'
              : '표지 생성 중… (Cursor CLI + CDP Chrome)',
          )
          startPolling()
        } else if (data.status === 'error') {
          setCoverStatus('error')
          setCoverMessage(data.error || '표지 생성에 실패했습니다.')
        } else if (data.status === 'success' && data.publicUrl) {
          if (data.publicUrl !== article.image) {
            applyCoverSuccess(data.publicUrl, data.keywords, data.logo)
          }
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / slug / coverGen only
  }, [article.slug, searchParams])

  const coverGenOptions = async (): Promise<CoverGenOptions> => {
    const selectedCover =
      imageValue &&
      !imageValue.includes('/images/generated/') &&
      !imageValue.includes('/generated/')
        ? imageValue
        : null
    return {
      additionalPrompt: coverAdditionalPrompt,
      productRelated: coverProductRelated,
      paletteColors: selectedCover ? coverPalette(selectedCover) : undefined,
      backgroundColor: coverBackgroundColor,
      referenceImages: coverReferencePhotos.length
        ? await coverRefsToPayload(coverReferencePhotos)
        : undefined,
    }
  }

  const kickOffCoverJob = async (mode: CoverJobMode) => {
    setCoverStatus('running')
    setCoverMessage(
      mode === 'redownload'
        ? 'Gemini 페이지에서 이미지 다시 다운로드 중…'
        : '표지 생성을 백그라운드에서 시작합니다…',
    )
    try {
      const opts =
        mode === 'generate' ? await coverGenOptions() : ({} as CoverGenOptions)
      await startCoverJob(article.slug, imageValue, mode, opts)
      setCoverMessage(
        mode === 'redownload'
          ? 'Gemini 페이지에서 이미지 다시 다운로드 중…'
          : '표지 생성 중… (Cursor CLI + CDP Chrome)',
      )
      startPolling()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCoverStatus('error')
      setCoverMessage(
        (mode === 'redownload' ? '이미지 다시 다운로드 시작 실패: ' : '표지 생성 시작 실패: ') +
          msg,
      )
    }
  }

  /** Local-only: background generate-cover (CDP Chrome required). */
  const handleGenerateCover = async () => {
    if (!confirm('표지 생성을 시작할까요? (Cursor CLI + CDP Chrome / Gemini 필요)')) return
    await kickOffCoverJob('generate')
  }

  const handleRedownloadCover = async () => {
    await kickOffCoverJob('redownload')
  }

  const handleRegenerateCover = async () => {
    // Reuse last job's additional prompt (textarea may be empty after reload).
    try {
      const data = await fetchCoverStatus(article.slug)
      restoreCoverOptionsFromJob(data.job)
      const saved =
        typeof data.job?.additionalPrompt === 'string'
          ? data.job.additionalPrompt.trim()
          : ''
      if (saved) setCoverAdditionalPrompt((prev) => prev.trim() || saved)
      const opts = await coverGenOptions()
      opts.additionalPrompt = opts.additionalPrompt?.trim() || saved || undefined
      setCoverStatus('running')
      setCoverMessage('표지 생성을 백그라운드에서 시작합니다…')
      await startCoverJob(article.slug, imageValue, 'generate', opts)
      setCoverMessage('표지 생성 중… (Cursor CLI + CDP Chrome)')
      startPolling()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCoverStatus('error')
      setCoverMessage('표지 생성 시작 실패: ' + msg)
    }
  }

  const syncBody = (value: string) => {
    draft.current.body = value
    setBodyValue(value)
  }

  const handleCoverSave = async () => {
    setSaving(true)
    try {
      draft.current.created = createdValue.trim() || undefined
      draft.current.description = descriptionValue
      draft.current.tags = parseTagsInput(tagsValue)
      const res = await fetch(`/api/articles/${article.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft.current),
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setArticle(updated)
      setCreatedValue(updated.created || '')
      setDescriptionValue(updated.description || '')
      setTagsValue(formatTagsInput(updated.tags))
      setImageValue(updated.image)
      setCoverEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert('저장 실패: ' + e)
    } finally {
      setSaving(false)
    }
  }

  const handleCoverCancel = () => {
    draft.current = { ...article }
    setCreatedValue(article.created || '')
    setDescriptionValue(article.description || '')
    setTagsValue(formatTagsInput(article.tags))
    setImageValue(article.image)
    setCoverEditing(false)
  }

  const handleBodySave = async () => {
    setSaving(true)
    try {
      const payload = { ...article, body: bodyValue }
      const res = await fetch(`/api/articles/${article.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setArticle(updated)
      setBodyValue(updated.body)
      draft.current.body = updated.body
      setBodyEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert('저장 실패: ' + e)
    } finally {
      setSaving(false)
    }
  }

  const handleBodyCancel = () => {
    setBodyValue(article.body)
    draft.current.body = article.body
    setBodyEditing(false)
  }

  const enterBodyEditing = useCallback(() => {
    setCoverEditing(false)
    setBodyValue(article.body)
    draft.current.body = article.body
    setBodyEditing(true)
    requestAnimationFrame(() => bodyRef.current?.focus())
  }, [article.body])

  const exitBodyEditing = useCallback(() => {
    setBodyValue(article.body)
    draft.current.body = article.body
    setBodyEditing(false)
  }, [article.body])

  const toggleBodyEditing = useCallback(() => {
    if (bodyEditing) {
      exitBodyEditing()
    } else {
      enterBodyEditing()
    }
  }, [bodyEditing, enterBodyEditing, exitBodyEditing])

  useEffect(() => {
    if (canEdit) return
    setCoverEditing(false)
    setBodyEditing(false)
  }, [canEdit])

  useEffect(() => {
    if (!canEdit) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'e') return
      const target = e.target as HTMLElement | null
      if (
        coverEditing &&
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      e.preventDefault()
      toggleBodyEditing()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canEdit, coverEditing, toggleBodyEditing])

  const generatingCover = coverStatus === 'running'
  const localTools = isLocalToolsEnabled()

  return (
    <article className={styles.article}>
      <TistoryMoreLessHydrate />
      <ArticleCoverBanner
        src={coverEditing ? imageValue : article.image}
        alt={article.title}
        priority
      />

      <div className={styles.content}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.back}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All Articles
          </Link>
          <div className={styles.actions}>
            {article.draft ? (
              <span className={styles.draftBadge} title="임시저장 글">
                임시저장
              </span>
            ) : null}
            {uploading && <span className={styles.savedBadge}>이미지 업로드 중…</span>}
            {localTools && generatingCover && (
              <span className={styles.savedBadge}>표지 생성 중…</span>
            )}
            {localTools && coverStatus === 'success' && (
              <span className={styles.savedBadge}>✓ 표지 생성됨</span>
            )}
            {saved && <span className={styles.savedBadge}>✓ 저장됨</span>}
            {canEdit && coverEditing ? (
              <>
                <button className={styles.btnCancel} onClick={handleCoverCancel} disabled={uploading}>취소</button>
                <button className={styles.btnSave} onClick={handleCoverSave} disabled={saving || uploading}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </>
            ) : canEdit && bodyEditing ? (
              <>
                <button className={styles.btnCancel} onClick={handleBodyCancel} disabled={uploading}>취소</button>
                <button className={styles.btnSave} onClick={handleBodySave} disabled={saving || uploading}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </>
            ) : canEdit ? (
              <button
                type="button"
                className={styles.btnSettings}
                onClick={() => {
                  draft.current = { ...article }
                  setCreatedValue(article.created || '')
                  setDescriptionValue(article.description || '')
                  setTagsValue(formatTagsInput(article.tags))
                  setImageValue(article.image)
                  setBodyEditing(false)
                  setCoverEditing(true)
                }}
                title="표지·메타데이터 편집"
                aria-label="표지·메타데이터 편집"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {localTools &&
          (coverStatus === 'running' || coverStatus === 'error' || coverStatus === 'success') &&
          coverMessage && (
            <div
              className={
                coverStatus === 'error'
                  ? styles.coverGenBannerError
                  : coverStatus === 'success'
                    ? styles.coverGenBannerOk
                    : styles.coverGenBanner
              }
              role="status"
            >
              <span>{coverMessage}</span>
              {canEdit && coverStatus === 'error' && (
                <span className={styles.coverGenErrorActions}>
                  <button
                    type="button"
                    className={styles.coverGenRetry}
                    onClick={handleRedownloadCover}
                    disabled={generatingCover}
                  >
                    다시 다운로드
                  </button>
                  <button
                    type="button"
                    className={styles.coverGenRetry}
                    onClick={handleRegenerateCover}
                    disabled={generatingCover}
                  >
                    다시 생성
                  </button>
                </span>
              )}
            </div>
          )}

        {canEdit && coverEditing ? (
          <input
            className={styles.titleInput}
            defaultValue={article.title}
            onChange={(e) => (draft.current.title = e.target.value)}
          />
        ) : (
          <h1 className={styles.title}>{article.title}</h1>
        )}

        {canEdit && coverEditing ? (
          <div className={styles.frontmatter}>
            <label className={styles.fmField}>
              <span className={styles.fmLabel}>created</span>
              <input
                type="date"
                className={styles.fmInput}
                value={createdValue}
                onChange={(e) => setCreatedValue(e.target.value)}
              />
            </label>
            <label className={styles.fmField}>
              <span className={styles.fmLabel}>description</span>
              <textarea
                className={styles.descInput}
                value={descriptionValue}
                rows={2}
                onChange={(e) => setDescriptionValue(e.target.value)}
                placeholder="한 줄 설명 (Obsidian description)"
              />
            </label>
            <label className={styles.fmField}>
              <span className={styles.fmLabel}>tags</span>
              <input
                className={styles.fmInput}
                value={tagsValue}
                onChange={(e) => setTagsValue(e.target.value)}
                placeholder="쉼표로 구분 (예: drone, physics)"
                disabled={generatingCover || uploading || saving}
              />
            </label>
            <div className={styles.fmField}>
              <span className={styles.fmLabel}>cover</span>
              {localTools && (
                <>
                  <CoverReferencePhotos
                    photos={coverReferencePhotos}
                    onChange={setCoverReferencePhotos}
                    disabled={generatingCover || uploading || saving}
                  />
                  <CoverBackgroundPicker
                    value={coverBackgroundColor}
                    onChange={setCoverBackgroundColor}
                    disabled={generatingCover || uploading || saving}
                  />
                  <label className={styles.fmField}>
                    <span className={styles.fmLabel}>추가 프롬프트 (선택)</span>
                    <textarea
                      className={styles.descInput}
                      value={coverAdditionalPrompt}
                      onChange={(e) => setCoverAdditionalPrompt(e.target.value)}
                      rows={2}
                      placeholder="Cursor 키워드 추출·Gemini 표지 생성에 반영할 추가 지시"
                      disabled={generatingCover || uploading || saving}
                    />
                  </label>
                  <div className={styles.coverActions}>
                    <label
                      className={styles.coverAutoCheck}
                      title="제품·소프트웨어 로고를 표지에 포함"
                    >
                      <input
                        type="checkbox"
                        checked={coverProductRelated}
                        onChange={(e) => setCoverProductRelated(e.target.checked)}
                        disabled={generatingCover || uploading || saving}
                      />
                      <span>제품/브랜드 관련 (공식 로고 포함)</span>
                    </label>
                    <button
                      type="button"
                      className={styles.btnGenerateCover}
                      onClick={handleGenerateCover}
                      disabled={generatingCover || uploading || saving}
                      title="키워드 추출(Cursor CLI) → Gemini CDP 표지 생성 (백그라운드)"
                    >
                      {generatingCover ? '표지 생성 중…' : '표지 생성'}
                    </button>
                    {coverStatus === 'error' && (
                      <span className={styles.coverGenErrorActions}>
                        <button
                          type="button"
                          className={styles.coverGenRetry}
                          onClick={handleRedownloadCover}
                          disabled={generatingCover}
                        >
                          다시 다운로드
                        </button>
                        <button
                          type="button"
                          className={styles.coverGenRetry}
                          onClick={handleRegenerateCover}
                          disabled={generatingCover}
                        >
                          다시 생성
                        </button>
                      </span>
                    )}
                  </div>
                  {coverMessage && coverEditing && (
                    <p
                      className={
                        coverStatus === 'error' ? styles.coverGenError : styles.coverGenStatus
                      }
                      role="status"
                    >
                      {coverMessage}
                    </p>
                  )}
                </>
              )}
              <div className={styles.coverGrid} role="listbox" aria-label="표지 색 팔레트 선택">
                {coverPickerImages.map((src) => {
                  const selected = imageValue === src
                  const label = coverLabel(src)
                  return (
                    <button
                      key={src}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`${styles.coverOption} ${selected ? styles.coverOptionActive : ''}`}
                      onClick={() => selectCover(src)}
                      title={label}
                      disabled={generatingCover}
                    >
                      <CoverPaletteThumb colors={coverPalette(src)} label={label} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.metaBlock}>
            {article.created && (
              <time className={styles.createdAt} dateTime={article.created}>
                {article.created}
              </time>
            )}
            {article.description ? (
              <p className={styles.description}>{article.description}</p>
            ) : null}
          </div>
        )}

        <hr className={styles.divider} />

        <div
          className={`article-body ${styles.body} ${formatBodyClassName(resolveArticleFormat(article.format))}`}
          data-format={resolveArticleFormat(article.format)}
        >
          {canEdit && bodyEditing ? (
            <HybridMarkdownEditor
              ref={bodyRef}
              variant="inline"
              value={bodyValue}
              onChange={syncBody}
              uploadImage={uploadImageFile}
              onUploadingChange={setUploading}
              disabled={uploading}
            />
          ) : (
            renderArticleBody(article.body, {
              imageClassName: styles.bodyImage,
              format: article.format,
            })
          )}
        </div>

        {!bodyEditing && !coverEditing && (
          <CommentsSection articleSlug={article.slug} />
        )}
      </div>
    </article>
  )
}
