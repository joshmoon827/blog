'use client'

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  coverImages,
  coverPickerImages,
  coverLabel,
  coverPalette,
} from '@/data/covers'
import { BLOG_CATEGORIES, categoryLabel } from '@/data/categories'
import CoverPaletteThumb from '@/components/CoverPaletteThumb'
import ObsidianNotePicker, {
  type ImportedObsidianNote,
} from '@/app/articles/new/ObsidianNotePicker'
import type { TistoryTinyEditorHandle } from '@/components/tistoryTinyShared'
import {
  CoverReferencePhotos,
  coverRefsToPayload,
  revokeCoverReferencePhotos,
  type CoverReferencePhoto,
} from '@/components/CoverReferencePhotos'
import CoverBackgroundPicker from '@/components/CoverBackgroundPicker'
import { formatTagsInput, parseTagsInput } from '@/lib/parseFrontmatter'
import { isLocalToolsEnabled } from '@/lib/isLocalTools'
import { openNewritePreviewTab } from '@/lib/newritePreview'
import { renderArticleBody } from '@/lib/renderArticleBody'
import TistoryPreviewBody from '@/components/TistoryPreviewBody'
import TistoryMoreLessHydrate from '@/components/TistoryMoreLessHydrate'
import type { HybridMarkdownEditorHandle } from '@/components/HybridMarkdownEditor'
import NewriteToolbar, {
  type EditorViewMode,
  NEWRITE_SIDE_MARGIN_DEFAULT,
  NEWRITE_SIDE_MARGIN_MAX,
  NEWRITE_SIDE_MARGIN_MIN,
} from './NewriteToolbar'
import styles from './newrite.module.css'

const TistoryTinyEditor = dynamic(
  () =>
    import('@/components/TistoryTinyEditor').then((mod) => ({
      default: mod.TistoryTinyEditor,
    })),
  { ssr: false },
)

const HybridMarkdownEditor = dynamic(
  () =>
    import('@/components/HybridMarkdownEditor').then((mod) => ({
      default: mod.HybridMarkdownEditor,
    })),
  { ssr: false },
)

const DRAFT_STORAGE_KEY = 'newrite-autosave-v2'
const SIDE_MARGIN_STORAGE_KEY = 'newrite-side-margin'

function clampSideMargin(n: number) {
  if (!Number.isFinite(n)) return NEWRITE_SIDE_MARGIN_DEFAULT
  return Math.min(
    NEWRITE_SIDE_MARGIN_MAX,
    Math.max(NEWRITE_SIDE_MARGIN_MIN, Math.round(n)),
  )
}

function readStoredSideMargin(): number {
  try {
    const raw = localStorage.getItem(SIDE_MARGIN_STORAGE_KEY)
    if (raw == null) return NEWRITE_SIDE_MARGIN_DEFAULT
    return clampSideMargin(Number(raw))
  } catch {
    return NEWRITE_SIDE_MARGIN_DEFAULT
  }
}

type StoredDraft = {
  title: string
  description: string
  created: string
  tagsText: string
  category: string
  image: string
  /** Tistory / HTML body buffer */
  body: string
  /** Markdown (기본 모드) buffer — kept separate; switching is not lossy conversion */
  mdBody?: string
  editorMode?: EditorViewMode
  savedAt: number
}

type SpellIssue = {
  id: string
  severity: 'warn' | 'info'
  message: string
}

function runDraftChecks(opts: {
  title: string
  body: string
  tagsText: string
}): SpellIssue[] {
  const issues: SpellIssue[] = []
  const { title, body, tagsText } = opts
  if (!title.trim()) {
    issues.push({
      id: 'empty-title',
      severity: 'warn',
      message: '제목이 비어 있습니다.',
    })
  }
  if (!body.trim()) {
    issues.push({
      id: 'empty-body',
      severity: 'warn',
      message: '본문이 비어 있습니다.',
    })
  }
  if (/\s{3,}/.test(body)) {
    issues.push({
      id: 'spaces',
      severity: 'info',
      message: '연속된 공백(3칸 이상)이 있습니다.',
    })
  }
  const longLine = body.split('\n').find((l) => l.length > 200)
  if (longLine) {
    issues.push({
      id: 'long-line',
      severity: 'info',
      message: `매우 긴 줄이 있습니다 (${longLine.length}자). 가독성을 위해 나누는 것을 권장합니다.`,
    })
  }
  if (/([.!?…])\1{2,}/.test(body)) {
    issues.push({
      id: 'punct',
      severity: 'info',
      message: '문장부호가 과도하게 반복됩니다.',
    })
  }
  if (tagsText.includes('  ')) {
    issues.push({
      id: 'tag-space',
      severity: 'info',
      message: '태그에 연속 공백이 있습니다.',
    })
  }
  // Repeated Hangul syllable pairs like "안녕안녕" are fine; flag same word 3+ times in a row
  if (/([가-힣A-Za-z0-9]{2,})(?:\s+\1){2,}/.test(body)) {
    issues.push({
      id: 'repeat-word',
      severity: 'warn',
      message: '같은 단어가 연속으로 반복됩니다.',
    })
  }
  if (issues.length === 0) {
    issues.push({
      id: 'ok',
      severity: 'info',
      message:
        '기본 검사에서 눈에 띄는 문제는 없습니다. 브라우저 맞춤법(빨간 밑줄)도 함께 확인하세요.',
    })
  }
  return issues
}

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

type CoverGenStatus = 'idle' | 'loading' | 'success' | 'error'
type CoverJobMode = 'generate' | 'redownload'

type CoverGenOptions = {
  additionalPrompt?: string
  productRelated?: boolean
  swissModernist?: boolean
  paletteColors?: string[]
  backgroundColor?: string
  referenceImages?: Array<{
    filename: string
    contentType: string
    contentBase64: string
  }>
}

async function startCoverGeneration(
  slug: string,
  cover: string,
  mode: CoverJobMode = 'generate',
  opts: CoverGenOptions = {},
) {
  const body: Record<string, unknown> = {
    slug,
    cover,
    force: true,
    background: true,
    mode,
    productRelated: opts.productRelated !== false,
    swissModernist: opts.swissModernist !== false,
  }
  const extra = opts.additionalPrompt?.trim()
  if (extra) body.additionalPrompt = extra
  if (opts.paletteColors?.length) body.paletteColors = opts.paletteColors
  if (typeof opts.backgroundColor === 'string') {
    body.backgroundColor = opts.backgroundColor
  }
  if (opts.referenceImages?.length) body.referenceImages = opts.referenceImages
  const coverRes = await fetch('/api/generate-cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const coverData = (await coverRes.json()) as {
    error?: string
    started?: boolean
    status?: string
  }
  if (!coverRes.ok) {
    throw new Error(coverData.error || `Generate failed (${coverRes.status})`)
  }
  return coverData
}

function formatSaveClock(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function readStoredDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export default function NewriteEditor() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [created, setCreated] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [tagsText, setTagsText] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [category, setCategory] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [image, setImage] = useState<string>(coverImages[0])
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [autoGenerateCover, setAutoGenerateCover] = useState(() =>
    isLocalToolsEnabled(),
  )
  const [coverAdditionalPrompt, setCoverAdditionalPrompt] = useState('')
  const [coverProductRelated, setCoverProductRelated] = useState(true)
  const [coverSwissModernist, setCoverSwissModernist] = useState(true)
  const [coverBackgroundColor, setCoverBackgroundColor] = useState('')
  const [coverReferencePhotos, setCoverReferencePhotos] = useState<
    CoverReferencePhoto[]
  >([])
  const [coverGenStatus, setCoverGenStatus] = useState<CoverGenStatus>('idle')
  const [coverGenMessage, setCoverGenMessage] = useState('')
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [obsidianOpen, setObsidianOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [spellOpen, setSpellOpen] = useState(false)
  const [spellIssues, setSpellIssues] = useState<SpellIssue[]>([])
  const [spellcheckOn, setSpellcheckOn] = useState(true)
  const [draftCount, setDraftCount] = useState(0)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftSavedSlug, setDraftSavedSlug] = useState<string | null>(null)
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorViewMode>('wysiwyg')
  const [htmlSource, setHtmlSource] = useState('')
  const [mdBody, setMdBody] = useState('')
  const [sideMarginPct, setSideMarginPct] = useState(NEWRITE_SIDE_MARGIN_DEFAULT)
  const bodyRef = useRef<TistoryTinyEditorHandle>(null)
  const mdRef = useRef<HybridMarkdownEditorHandle>(null)
  const categoryRef = useRef<HTMLDivElement>(null)
  const localTools = isLocalToolsEnabled()
  const isMarkdownMode = editorMode === 'markdown'
  const articleFormat = isMarkdownMode ? 'default' : 'tistory'

  const handleSideMarginChange = (pct: number) => {
    const next = clampSideMargin(pct)
    setSideMarginPct(next)
    try {
      localStorage.setItem(SIDE_MARGIN_STORAGE_KEY, String(next))
    } catch {
      /* quota / private mode */
    }
  }

  const flushHtmlFromEditor = () => {
    const ed = bodyRef.current?.getEditor()
    if (editorMode === 'html') return htmlSource
    if (editorMode === 'wysiwyg') {
      return ed?.getContent({ format: 'html' }) ?? body
    }
    return body
  }

  const handleEditorModeChange = (mode: EditorViewMode) => {
    if (mode === editorMode) return

    // Flush buffers for the mode we are leaving (no auto-convert — lossy).
    if (editorMode === 'wysiwyg' || editorMode === 'html') {
      const html = flushHtmlFromEditor()
      setBody(html)
      if (mode === 'html') setHtmlSource(html)
    }

    if (mode === 'wysiwyg') {
      const html = editorMode === 'html' ? htmlSource : body
      const ed = bodyRef.current?.getEditor()
      if (ed) {
        ed.setContent(html)
        setBody(ed.getContent({ format: 'html' }))
      } else {
        setBody(html)
      }
      setEditorMode('wysiwyg')
      return
    }

    if (mode === 'html') {
      setHtmlSource(editorMode === 'wysiwyg' ? flushHtmlFromEditor() : body)
      setEditorMode('html')
      return
    }

    // markdown (기본 모드) — restore md buffer as-is
    setEditorMode('markdown')
  }

  useEffect(() => {
    document.body.dataset.writeMode = 'newrite'
    return () => {
      delete document.body.dataset.writeMode
    }
  }, [])

  useEffect(() => {
    return () => revokeCoverReferencePhotos(coverReferencePhotos)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke latest list on unmount
  }, [])

  useEffect(() => {
    const stored = readStoredDraft()
    if (stored) {
      setTitle(stored.title || '')
      setDescription(stored.description || '')
      setCreated(stored.created || new Date().toISOString().slice(0, 10))
      setTagsText(stored.tagsText || '')
      setCategory(stored.category || '')
      if (stored.image) setImage(stored.image)
      setBody(stored.body || '')
      setMdBody(stored.mdBody || '')
      if (
        stored.editorMode === 'wysiwyg' ||
        stored.editorMode === 'html' ||
        stored.editorMode === 'markdown'
      ) {
        setEditorMode(stored.editorMode)
        if (stored.editorMode === 'html') {
          setHtmlSource(stored.body || '')
        }
      }
      if (stored.savedAt) setAutoSavedAt(stored.savedAt)
    }
    setSideMarginPct(readStoredSideMargin())
    setHydrated(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadDraftCount = async () => {
      try {
        const res = await fetch('/api/articles')
        if (!res.ok) return
        const articles = (await res.json()) as Array<{ draft?: boolean }>
        if (!cancelled) {
          setDraftCount(articles.filter((a) => a.draft).length)
        }
      } catch {
        /* offline / unauthorized */
      }
    }
    void loadDraftCount()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    bodyRef.current?.setSpellcheck(spellcheckOn)
    mdRef.current?.setSpellcheck?.(spellcheckOn)
  }, [hydrated, spellcheckOn, body, mdBody, editorMode])

  useEffect(() => {
    if (!hydrated || createdSlug) return
    const hasContent =
      title.trim() ||
      body.trim() ||
      mdBody.trim() ||
      tagsText.trim() ||
      description.trim() ||
      category
    if (!hasContent) return

    const timer = window.setTimeout(() => {
      const savedAt = Date.now()
      const payload: StoredDraft = {
        title,
        description,
        created,
        tagsText,
        category,
        image,
        body,
        mdBody,
        editorMode,
        savedAt,
      }
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
        setAutoSavedAt(savedAt)
      } catch {
        /* quota / private mode */
      }
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    hydrated,
    createdSlug,
    title,
    description,
    created,
    tagsText,
    category,
    image,
    body,
    mdBody,
    editorMode,
  ])

  useEffect(() => {
    if (!settingsOpen && !previewOpen && !spellOpen && !categoryOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSettingsOpen(false)
      setPreviewOpen(false)
      setSpellOpen(false)
      setCategoryOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, previewOpen, spellOpen, categoryOpen])

  useEffect(() => {
    if (!categoryOpen) return
    const onDoc = (e: MouseEvent) => {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(e.target as Node)
      ) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [categoryOpen])

  const handleImportObsidian = (note: ImportedObsidianNote) => {
    setTitle(note.title)
    setDescription(note.description)
    setCreated(note.created || new Date().toISOString().slice(0, 10))
    setTagsText(formatTagsInput(note.tags))
    setMdBody(note.body)
    setEditorMode('markdown')
    setSettingsOpen(false)
  }

  const coverGenOptions = async (): Promise<CoverGenOptions> => ({
    additionalPrompt: coverAdditionalPrompt,
    productRelated: coverProductRelated,
    swissModernist: coverSwissModernist,
    paletteColors: coverPalette(image),
    backgroundColor: coverBackgroundColor,
    referenceImages: coverReferencePhotos.length
      ? await coverRefsToPayload(coverReferencePhotos)
      : undefined,
  })

  const kickOffCover = async (slug: string, mode: CoverJobMode) => {
    setCoverGenStatus('loading')
    setCoverGenMessage(
      mode === 'redownload'
        ? 'Gemini 페이지에서 이미지 다시 다운로드 중…'
        : '표지 생성을 백그라운드에서 시작합니다…',
    )
    try {
      const opts =
        mode === 'generate' ? await coverGenOptions() : ({} as CoverGenOptions)
      await startCoverGeneration(slug, image, mode, opts)
      router.push(`/articles/${slug}?coverGen=1`)
      router.refresh()
    } catch (coverErr) {
      const msg =
        coverErr instanceof Error ? coverErr.message : String(coverErr)
      setCoverGenStatus('error')
      setCoverGenMessage(
        (mode === 'redownload'
          ? '이미지 다시 다운로드 시작에 실패했습니다: '
          : '글은 발행됐지만 표지 생성 시작에 실패했습니다: ') + msg,
      )
    }
  }

  const persistAutosave = () => {
    const savedAt = Date.now()
    const payload: StoredDraft = {
      title,
      description,
      created,
      tagsText,
      category,
      image,
      body,
      mdBody,
      editorMode,
      savedAt,
    }
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
      setAutoSavedAt(savedAt)
    } catch {
      /* ignore */
    }
  }

  const liveEditorBody = () => {
    if (editorMode === 'markdown') {
      return mdRef.current?.getMarkdown?.() ?? mdBody
    }
    if (editorMode === 'html') return htmlSource
    const ed = bodyRef.current?.getEditor()
    return ed?.getContent({ format: 'html' }) ?? body
  }

  /** Persist a draft article (stock cover only — never generate-cover). */
  const handleDraftSave = async () => {
    setDraftSaving(true)
    setDraftSavedSlug(null)
    try {
      const liveBody = liveEditorBody()
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || '제목 없음',
          description,
          created,
          tags: parseTagsInput(tagsText),
          category: category || undefined,
          format: articleFormat,
          body: liveBody,
          draft: true,
        }),
      })
      const data = (await res.json()) as {
        slug?: string
        image?: string
        error?: string
      }
      if (!res.ok || !data.slug) {
        throw new Error(data.error || `Draft save failed (${res.status})`)
      }
      if (data.image) setImage(data.image)
      setDraftSavedSlug(data.slug)
      setDraftCount((n) => n + 1)
      persistAutosave()
      router.refresh()
    } catch (err) {
      alert(
        '임시저장 실패: ' + (err instanceof Error ? err.message : String(err)),
      )
    } finally {
      setDraftSaving(false)
    }
  }

  const clearDraftStorage = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  const openPreview = () => setPreviewOpen(true)

  const openFullPreview = () => {
    openNewritePreviewTab({
      title,
      body: liveEditorBody(),
      tagsText,
      category,
      format: articleFormat,
    })
  }

  const tags = parseTagsInput(tagsText)

  const commitTagDraft = () => {
    const next = tagDraft.trim().replace(/^#/, '')
    if (!next) {
      setTagDraft('')
      return
    }
    const merged = parseTagsInput(
      tags.length ? `${formatTagsInput(tags)}, ${next}` : next,
    )
    setTagsText(formatTagsInput(merged))
    setTagDraft('')
  }

  const removeTag = (tag: string) => {
    setTagsText(formatTagsInput(tags.filter((t) => t !== tag)))
  }

  const openSpellcheck = () => {
    setSpellcheckOn(true)
    if (isMarkdownMode) {
      mdRef.current?.setSpellcheck?.(true)
      mdRef.current?.focus()
    } else {
      bodyRef.current?.setSpellcheck(true)
      bodyRef.current?.focus()
    }
    setSpellIssues(
      runDraftChecks({
        title,
        body: liveEditorBody(),
        tagsText,
      }),
    )
    setSpellOpen(true)
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) {
      alert('제목을 입력하세요.')
      return
    }
    setSaving(true)
    setCoverGenStatus('idle')
    setCoverGenMessage('')
    try {
      const liveBody = liveEditorBody()
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          created,
          tags: parseTagsInput(tagsText),
          category: category || undefined,
          format: articleFormat,
          image,
          body: liveBody,
        }),
      })
      const data = (await res.json()) as { slug?: string; error?: string }
      if (!res.ok || !data.slug) {
        throw new Error(data.error || `Create failed (${res.status})`)
      }

      const slug = data.slug
      setCreatedSlug(slug)
      clearDraftStorage()

      if (localTools && autoGenerateCover) {
        await kickOffCover(slug, 'generate')
        return
      }

      router.push(`/articles/${slug}`)
      router.refresh()
    } catch (err) {
      alert('저장 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const busy =
    saving ||
    draftSaving ||
    uploading ||
    (localTools && coverGenStatus === 'loading') ||
    Boolean(createdSlug)

  return (
    <div className={styles.shell} data-newrite>
      <TistoryMoreLessHydrate />
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand} aria-label="Laws of UX 홈">
          <span className={styles.brandMark} aria-hidden="true" />
        </Link>
        <NewriteToolbar
          editorRef={bodyRef}
          disabled={busy}
          editorMode={editorMode}
          onEditorModeChange={handleEditorModeChange}
          sideMarginPct={sideMarginPct}
          onSideMarginChange={handleSideMarginChange}
        />
        <div className={styles.topActions}>
          {localTools ? (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setObsidianOpen(true)}
              disabled={busy}
            >
              Obsidian
            </button>
          ) : null}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setSettingsOpen(true)}
            disabled={busy && !createdSlug}
            aria-expanded={settingsOpen}
            aria-controls="newrite-settings"
          >
            설정
          </button>
          {uploading ? (
            <span className={styles.statusChip}>업로드 중…</span>
          ) : null}
          {localTools && coverGenStatus === 'loading' ? (
            <span className={styles.statusChip}>표지 생성 중…</span>
          ) : null}
        </div>
      </header>

      {/* Sole scroll region (Tistory #editorContainer): category/title/body/tags */}
      <div className={styles.canvas} data-newrite-canvas>
        <form
          className={styles.canvasInner}
          onSubmit={handleSubmit}
          id="newrite-form"
          style={
            {
              '--newrite-side-margin': `${sideMarginPct}%`,
            } as CSSProperties
          }
        >
          <div className={styles.categoryRow} ref={categoryRef}>
            <button
              type="button"
              className={styles.categoryBtn}
              onClick={() => setCategoryOpen((o) => !o)}
              aria-expanded={categoryOpen}
              aria-haspopup="listbox"
              aria-label="카테고리 선택"
              disabled={busy}
            >
              {categoryLabel(category)}
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {categoryOpen ? (
              <ul
                className={styles.categoryMenu}
                role="listbox"
                aria-label="카테고리"
              >
                {BLOG_CATEGORIES.map((c) => {
                  const selected = category === c.id
                  return (
                    <li key={c.id || 'none'} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${styles.categoryOption} ${selected ? styles.categoryOptionActive : ''}`}
                        onClick={() => {
                          setCategory(c.id)
                          setCategoryOpen(false)
                        }}
                      >
                        {c.id ? c.label : '카테고리 없음'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>

          <label className={styles.srOnly} htmlFor="newrite-title">
            제목
          </label>
          <textarea
            id="newrite-title"
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            rows={1}
            autoFocus
            spellCheck={spellcheckOn}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
          />

          <hr className={styles.divider} />

          <div className={`article-body ${styles.body}`}>
            {editorMode === 'html' ? (
              <div className={styles.htmlIde}>
                <div className={styles.htmlIdeChrome} aria-hidden>
                  <span className={`${styles.htmlIdeDot} ${styles.htmlIdeDotRed}`} />
                  <span className={`${styles.htmlIdeDot} ${styles.htmlIdeDotYellow}`} />
                  <span className={`${styles.htmlIdeDot} ${styles.htmlIdeDotGreen}`} />
                  <span>body.html</span>
                </div>
                <textarea
                  className={styles.htmlIdeBody}
                  value={htmlSource}
                  onChange={(e) => {
                    setHtmlSource(e.target.value)
                    setBody(e.target.value)
                  }}
                  spellCheck={false}
                  aria-label="HTML 소스"
                  placeholder="<!-- HTML -->"
                />
              </div>
            ) : null}
            {editorMode === 'markdown' ? (
              <HybridMarkdownEditor
                ref={mdRef}
                variant="inline"
                value={mdBody}
                onChange={setMdBody}
                uploadImage={uploadImageFile}
                onUploadingChange={setUploading}
                disabled={uploading || busy}
                placeholder="마크다운으로 본문을 입력하세요"
              />
            ) : null}
            <div
              className={`${styles.tinyHost} ${
                editorMode === 'html' || editorMode === 'markdown'
                  ? styles.tinyHostHidden
                  : ''
              }`}
              aria-hidden={editorMode === 'html' || editorMode === 'markdown'}
            >
              <TistoryTinyEditor
                ref={bodyRef}
                value={body}
                onChange={setBody}
                uploadImage={uploadImageFile}
                onUploadingChange={setUploading}
                disabled={
                  uploading ||
                  busy ||
                  editorMode === 'html' ||
                  editorMode === 'markdown'
                }
                placeholder="본문을 입력하세요"
              />
            </div>
          </div>

        </form>
      </div>

      <footer className={styles.bottomBar}>
        <div className={styles.bottomLeft}>
          <div className={styles.footerTags} aria-label="태그">
            <ul className={styles.footerTagList}>
              {tags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    className={styles.footerTagChip}
                    onClick={() => removeTag(tag)}
                    title={`${tag} 삭제`}
                    aria-label={`${tag} 태그 삭제`}
                    disabled={busy}
                  >
                    <span className={styles.footerTagDot} aria-hidden>
                      #
                    </span>
                    {tag}
                    <span className={styles.footerTagRemove} aria-hidden>
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <label className={styles.srOnly} htmlFor="newrite-footer-tags">
              태그 입력
            </label>
            <input
              id="newrite-footer-tags"
              className={styles.footerTagInput}
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitTagDraft()
                  return
                }
                if (e.key === 'Backspace' && !tagDraft && tags.length) {
                  e.preventDefault()
                  removeTag(tags[tags.length - 1]!)
                }
              }}
              onBlur={commitTagDraft}
              placeholder={tags.length ? '태그 추가' : '#태그입력'}
              disabled={busy}
              spellCheck={spellcheckOn}
            />
          </div>
          <button
            type="button"
            className={styles.ghostLink}
            onClick={openPreview}
            title="발행 전 미리보기"
          >
            <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden>
              <rect
                x="1"
                y="1"
                width="14"
                height="10"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                fill="none"
              />
              <path d="M1 11.5h14" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span>미리보기</span>
          </button>
          <button
            type="button"
            className={`${styles.ghostLink} ${styles.ghostLinkExpand}`}
            onClick={openFullPreview}
            title="새 탭에서 크게 보기"
          >
            <span>크게 보기</span>
          </button>
          <button
            type="button"
            className={`${styles.ghostLink} ${styles.ghostLinkSpell}`}
            onClick={openSpellcheck}
            title="맞춤법 검사"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M4 19l5-14h2l5 14h-2.1l-1.2-3.4H7.3L6.1 19H4zm4.1-5.2h4.6L10.5 8.4 8.1 13.8z"
                fill="currentColor"
              />
              <path
                d="M16.5 11.5c1.8 0 3 1.1 3 2.7 0 1.2-.6 2.1-1.7 2.9l1.9 2.4H17.4l-1.5-2c-.2.05-.45.05-.7.05-2 0-3.2-1.15-3.2-2.8 0-1.7 1.35-2.85 3.5-2.85zm0 1.55c-.95 0-1.55.5-1.55 1.25s.6 1.25 1.55 1.25 1.55-.5 1.55-1.25-.6-1.25-1.55-1.25z"
                fill="currentColor"
              />
            </svg>
            <span>맞춤법</span>
          </button>
        </div>
        <div className={styles.bottomRight}>
          {autoSavedAt ? (
            <span className={styles.autoSave} role="status" aria-live="polite">
              자동 저장 완료 {formatSaveClock(autoSavedAt)}
            </span>
          ) : null}
          {draftSavedSlug ? (
            <Link
              href={`/articles/${draftSavedSlug}`}
              className={styles.autoSave}
              title="임시저장 글 보기"
            >
              임시저장됨 →
            </Link>
          ) : null}
          <div className={styles.draftBtn} role="group" aria-label="임시저장">
            <button
              type="button"
              className={styles.draftLabel}
              onClick={() => void handleDraftSave()}
              disabled={busy}
              title="임시저장 (표지는 기존 팔레트에서 랜덤)"
            >
              {draftSaving ? '저장 중…' : '임시저장'}
            </button>
            <Link
              href="/drafts"
              className={styles.draftCount}
              title="임시저장 목록 보기"
              aria-label={`임시저장 ${draftCount}개`}
            >
              {draftCount}
            </Link>
          </div>
          <button
            type="submit"
            form="newrite-form"
            className={styles.completeBtn}
            disabled={busy}
          >
            {saving
              ? localTools && coverGenStatus === 'loading'
                ? '표지…'
                : '저장 중…'
              : createdSlug
                ? '발행됨'
                : '완료'}
          </button>
        </div>
      </footer>

      {previewOpen ? (
        <div className={styles.modalRoot} role="presentation">
          <button
            type="button"
            className={styles.modalBackdrop}
            aria-label="미리보기 닫기"
            onClick={() => setPreviewOpen(false)}
          />
          <div
            className={styles.previewModal}
            role="dialog"
            aria-modal="true"
            aria-label="글 미리보기"
          >
            <div className={styles.previewHeader}>
              <h2 className={styles.previewTitle}>미리보기</h2>
              <div className={styles.previewHeaderActions}>
                <button
                  type="button"
                  className={styles.previewExpandBtn}
                  onClick={openFullPreview}
                  title="새 탭에서 크게 보기"
                >
                  크게 보기
                </button>
                <button
                  type="button"
                  className={styles.drawerClose}
                  onClick={() => setPreviewOpen(false)}
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>
            </div>
            <div className={styles.previewBody}>
              {category ? (
                <p className={styles.previewMeta}>{categoryLabel(category)}</p>
              ) : null}
              <h1 className={styles.previewArticleTitle}>
                {title.trim() || '제목 없음'}
              </h1>
              {tagsText.trim() ? (
                <p className={styles.previewTags}>
                  {parseTagsInput(tagsText).map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </p>
              ) : null}
              {articleFormat === 'tistory' ? (
                <TistoryPreviewBody
                  html={liveEditorBody()}
                  hydrate={false}
                  paper={false}
                  className={styles.previewContent}
                  emptyFallback={
                    <p className={styles.previewEmpty}>본문이 비어 있습니다.</p>
                  }
                />
              ) : (
                <div
                  className={`article-body ${styles.previewContent} article-format-default`}
                  data-format="default"
                >
                  {liveEditorBody().trim()
                    ? renderArticleBody(liveEditorBody(), {
                        format: 'default',
                      })
                    : (
                        <p className={styles.previewEmpty}>본문이 비어 있습니다.</p>
                      )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {spellOpen ? (
        <div className={styles.modalRoot} role="presentation">
          <button
            type="button"
            className={styles.modalBackdrop}
            aria-label="맞춤법 닫기"
            onClick={() => setSpellOpen(false)}
          />
          <div
            className={styles.spellModal}
            role="dialog"
            aria-modal="true"
            aria-label="맞춤법 검사"
          >
            <div className={styles.previewHeader}>
              <h2 className={styles.previewTitle}>맞춤법</h2>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setSpellOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <p className={styles.spellHelp}>
              브라우저 맞춤법을 켰습니다. 제목·본문의 빨간 밑줄을 확인하세요.
              macOS에서는 시스템 언어 설정의 한국어 사전을 사용합니다.
            </p>
            <ul className={styles.spellList}>
              {spellIssues.map((issue) => (
                <li
                  key={issue.id}
                  className={
                    issue.severity === 'warn'
                      ? styles.spellWarn
                      : styles.spellInfo
                  }
                >
                  {issue.message}
                </li>
              ))}
            </ul>
            <div className={styles.spellActions}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={spellcheckOn}
                  onChange={(e) => {
                    const on = e.target.checked
                    setSpellcheckOn(on)
                    bodyRef.current?.setSpellcheck(on)
                  }}
                />
                브라우저 맞춤법 사용
              </label>
              <button
                type="button"
                className={styles.draftBtn}
                onClick={() => {
                  setSpellIssues(runDraftChecks({ title, body, tagsText }))
                  bodyRef.current?.focus()
                }}
              >
                다시 검사
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <>
          <button
            type="button"
            className={styles.drawerBackdrop}
            aria-label="설정 닫기"
            onClick={() => setSettingsOpen(false)}
          />
          <aside
            id="newrite-settings"
            className={styles.drawer}
            aria-label="글 설정"
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>글 설정</h2>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setSettingsOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>작성일</span>
              <input
                type="date"
                className={styles.fieldInput}
                value={created}
                onChange={(e) => setCreated(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>설명</span>
              <textarea
                className={styles.fieldTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="짧은 설명"
              />
            </label>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>표지</span>
              {localTools ? (
                <>
                  <CoverReferencePhotos
                    photos={coverReferencePhotos}
                    onChange={setCoverReferencePhotos}
                    disabled={busy}
                  />
                  <CoverBackgroundPicker
                    value={coverBackgroundColor}
                    onChange={setCoverBackgroundColor}
                    disabled={busy}
                  />
                  <textarea
                    className={styles.fieldTextarea}
                    value={coverAdditionalPrompt}
                    onChange={(e) => setCoverAdditionalPrompt(e.target.value)}
                    rows={2}
                    placeholder="표지 추가 프롬프트 (선택)"
                    disabled={busy}
                  />
                  <div className={styles.checkRow}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={coverProductRelated}
                        onChange={(e) =>
                          setCoverProductRelated(e.target.checked)
                        }
                        disabled={saving || uploading}
                      />
                      제품/브랜드 관련
                    </label>
                    <label
                      className={styles.check}
                      title="스위스 모더니스트 추상 로고형 아트 디렉션을 표지 프롬프트에 포함 (기본 ON)"
                    >
                      <input
                        type="checkbox"
                        checked={coverSwissModernist}
                        onChange={(e) =>
                          setCoverSwissModernist(e.target.checked)
                        }
                        disabled={saving || uploading}
                      />
                      스위스 모더니스트
                    </label>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={autoGenerateCover}
                        onChange={(e) => setAutoGenerateCover(e.target.checked)}
                        disabled={saving || uploading}
                      />
                      발행 후 표지 자동 생성
                    </label>
                  </div>
                </>
              ) : null}
              <div className={styles.coverGrid} role="listbox" aria-label="표지">
                {coverPickerImages.map((src) => {
                  const selected = image === src
                  return (
                    <button
                      key={src}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`${styles.coverOption} ${selected ? styles.coverOptionActive : ''}`}
                      onClick={() => setImage(src)}
                      title={coverLabel(src)}
                      disabled={busy}
                    >
                      <CoverPaletteThumb
                        colors={coverPalette(src)}
                        label={coverLabel(src)}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {coverGenMessage ? (
              <p
                className={
                  coverGenStatus === 'error' ? styles.msgError : styles.msg
                }
                role="status"
              >
                {coverGenMessage}
              </p>
            ) : null}

            <Link href="/articles/new" className={styles.drawerLink}>
              이전 편집기 열기
            </Link>
          </aside>
        </>
      ) : null}

      {localTools ? (
        <ObsidianNotePicker
          open={obsidianOpen}
          onClose={() => setObsidianOpen(false)}
          onSelect={handleImportObsidian}
        />
      ) : null}
    </div>
  )
}
