'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  coverImages,
  coverPickerImages,
  coverLabel,
  coverPalette,
} from '@/data/covers'
import CoverPaletteThumb from '@/components/CoverPaletteThumb'
import ObsidianNotePicker, {
  type ImportedObsidianNote,
} from './ObsidianNotePicker'
import type { HybridMarkdownEditorHandle } from '@/components/HybridMarkdownEditor'
import {
  CoverReferencePhotos,
  coverRefsToPayload,
  revokeCoverReferencePhotos,
  type CoverReferencePhoto,
} from '@/components/CoverReferencePhotos'
import CoverBackgroundPicker from '@/components/CoverBackgroundPicker'
import { formatTagsInput, parseTagsInput } from '@/lib/parseFrontmatter'
import { isLocalToolsEnabled } from '@/lib/isLocalTools'
import styles from '../[slug]/page.module.css'

const HybridMarkdownEditor = dynamic(
  () =>
    import('@/components/HybridMarkdownEditor').then((mod) => ({
      default: mod.HybridMarkdownEditor,
    })),
  { ssr: false },
)

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
  /** Hex #rrggbb, or '' to clear / omit forced background. */
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

export default function NewArticleForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [created, setCreated] = useState(() => new Date().toISOString().slice(0, 10))
  const [tagsText, setTagsText] = useState('')
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
  const [retrying, setRetrying] = useState(false)
  const [obsidianOpen, setObsidianOpen] = useState(false)
  const [sourcePath, setSourcePath] = useState<string | undefined>()
  const bodyRef = useRef<HybridMarkdownEditorHandle>(null)
  const localTools = isLocalToolsEnabled()

  useEffect(() => {
    return () => revokeCoverReferencePhotos(coverReferencePhotos)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke latest list on unmount
  }, [])

  const handleImportObsidian = (note: ImportedObsidianNote) => {
    setTitle(note.title)
    setDescription(note.description)
    setCreated(note.created || new Date().toISOString().slice(0, 10))
    setTagsText(formatTagsInput(note.tags))
    setBody(note.body)
    setSourcePath(note.path)
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
      const msg = coverErr instanceof Error ? coverErr.message : String(coverErr)
      setCoverGenStatus('error')
      setCoverGenMessage(
        (mode === 'redownload' ? '이미지 다시 다운로드 시작에 실패했습니다: ' : '글은 발행됐지만 표지 생성 시작에 실패했습니다: ') +
          msg,
      )
    }
  }

  const kickOffCoverAndGo = async (slug: string) => {
    await kickOffCover(slug, 'generate')
  }

  const handleRedownloadCover = async () => {
    if (!createdSlug) return
    setRetrying(true)
    try {
      await kickOffCover(createdSlug, 'redownload')
    } finally {
      setRetrying(false)
    }
  }

  const handleRegenerateCover = async () => {
    if (!createdSlug) return
    setRetrying(true)
    try {
      await kickOffCover(createdSlug, 'generate')
    } finally {
      setRetrying(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('제목을 입력하세요.')
      return
    }
    setSaving(true)
    setCoverGenStatus('idle')
    setCoverGenMessage('')
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          created,
          tags: parseTagsInput(tagsText),
          image,
          body,
          format: sourcePath ? 'obsidian' : undefined,
          sourcePath: sourcePath || undefined,
        }),
      })
      const data = (await res.json()) as { slug?: string; error?: string }
      if (!res.ok || !data.slug) {
        throw new Error(data.error || `Create failed (${res.status})`)
      }

      const slug = data.slug
      setCreatedSlug(slug)

      if (localTools && autoGenerateCover) {
        await kickOffCoverAndGo(slug)
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

  return (
    <article className={styles.article}>
      <form className={styles.content} onSubmit={handleSubmit}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.back}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            All Articles
          </Link>
          <div className={styles.actions}>
            {uploading && <span className={styles.savedBadge}>이미지 업로드 중…</span>}
            {localTools && coverGenStatus === 'loading' && (
              <span className={styles.savedBadge}>표지 생성 시작 중…</span>
            )}
            {localTools && coverGenStatus === 'success' && (
              <span className={styles.savedBadge}>✓ 표지 생성됨</span>
            )}
            {localTools && coverGenStatus === 'error' && (
              <span className={styles.coverGenError}>표지 생성 실패</span>
            )}
            {localTools && (
              <button
                type="button"
                className={styles.btnObsidian}
                onClick={() => setObsidianOpen(true)}
                disabled={saving || uploading || coverGenStatus === 'loading' || Boolean(createdSlug)}
                title="Obsidian vault에서 노트 불러오기"
              >
                Obsidian에서 가져오기
              </button>
            )}
            <button
              type="submit"
              className={styles.btnSave}
              disabled={
                saving ||
                uploading ||
                (localTools && coverGenStatus === 'loading') ||
                Boolean(createdSlug)
              }
            >
              {saving
                ? localTools && coverGenStatus === 'loading'
                  ? '표지 생성 시작 중…'
                  : '저장 중…'
                : createdSlug
                  ? '발행됨'
                  : '발행'}
            </button>
          </div>
        </div>

        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          autoFocus
        />
        <div className={styles.frontmatter}>
          <label className={styles.fmField}>
            <span className={styles.fmLabel}>created</span>
            <input
              type="date"
              className={styles.fmInput}
              value={created}
              onChange={(e) => setCreated(e.target.value)}
            />
          </label>
          <label className={styles.fmField}>
            <span className={styles.fmLabel}>description</span>
            <textarea
              className={styles.descInput}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="짧은 설명 (Obsidian description)"
            />
          </label>
          <label className={styles.fmField}>
            <span className={styles.fmLabel}>tags</span>
            <input
              className={styles.fmInput}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="쉼표로 구분 (예: drone, physics)"
              disabled={saving || uploading || coverGenStatus === 'loading'}
            />
          </label>
          <div className={styles.fmField}>
            <span className={styles.fmLabel}>cover</span>
            {localTools && (
              <>
                <CoverReferencePhotos
                  photos={coverReferencePhotos}
                  onChange={setCoverReferencePhotos}
                  disabled={saving || uploading || coverGenStatus === 'loading'}
                />
                <CoverBackgroundPicker
                  value={coverBackgroundColor}
                  onChange={setCoverBackgroundColor}
                  disabled={saving || uploading || coverGenStatus === 'loading'}
                />
                <label className={styles.fmField}>
                  <span className={styles.fmLabel}>추가 프롬프트 (선택)</span>
                  <textarea
                    className={styles.descInput}
                    value={coverAdditionalPrompt}
                    onChange={(e) => setCoverAdditionalPrompt(e.target.value)}
                    rows={2}
                    placeholder="Cursor 키워드 추출·Gemini 표지 생성에 반영할 추가 지시"
                    disabled={saving || uploading || coverGenStatus === 'loading'}
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
                      disabled={saving || uploading}
                    />
                    <span>제품/브랜드 관련 (공식 로고 포함)</span>
                  </label>
                  <label
                    className={styles.coverAutoCheck}
                    title="스위스 모더니스트 추상 로고형 아트 디렉션을 표지 프롬프트에 포함 (기본 ON)"
                  >
                    <input
                      type="checkbox"
                      checked={coverSwissModernist}
                      onChange={(e) => setCoverSwissModernist(e.target.checked)}
                      disabled={saving || uploading}
                    />
                    <span>스위스 모더니스트 아트 디렉션</span>
                  </label>
                  <label
                    className={styles.coverAutoCheck}
                    title="발행 후 선택한 표지를 참고해 키워드 추출(Cursor CLI) → Gemini CDP 표지 생성 (백그라운드)"
                  >
                    <input
                      type="checkbox"
                      checked={autoGenerateCover}
                      onChange={(e) => setAutoGenerateCover(e.target.checked)}
                      disabled={saving || uploading}
                    />
                    <span>발행 후 표지 자동 생성</span>
                  </label>
                </div>
                {coverGenMessage && (
                  <p
                    className={
                      coverGenStatus === 'error'
                        ? styles.coverGenError
                        : styles.coverGenStatus
                    }
                    role="status"
                  >
                    {coverGenMessage}
                    {coverGenStatus === 'error' && createdSlug && (
                      <>
                        {' '}
                        <button
                          type="button"
                          className={styles.coverGenRetry}
                          onClick={handleRedownloadCover}
                          disabled={retrying}
                        >
                          {retrying ? '재시도 중…' : '다시 다운로드'}
                        </button>
                        {' · '}
                        <button
                          type="button"
                          className={styles.coverGenRetry}
                          onClick={handleRegenerateCover}
                          disabled={retrying}
                        >
                          다시 생성
                        </button>
                        {' · '}
                        <Link href={`/articles/${createdSlug}`} className={styles.coverGenLink}>
                          글로 이동
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </>
            )}
            <div className={styles.coverGrid} role="listbox" aria-label="표지 색 팔레트 선택">
              {coverPickerImages.map((src) => {
                const selected = image === src
                const label = coverLabel(src)
                return (
                  <button
                    key={src}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`${styles.coverOption} ${selected ? styles.coverOptionActive : ''}`}
                    onClick={() => setImage(src)}
                    title={label}
                    disabled={saving || coverGenStatus === 'loading'}
                  >
                    <CoverPaletteThumb colors={coverPalette(src)} label={label} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <hr className={styles.divider} />
        <div className={`article-body ${styles.body}`}>
          <HybridMarkdownEditor
            ref={bodyRef}
            value={body}
            onChange={setBody}
            uploadImage={uploadImageFile}
            onUploadingChange={setUploading}
            disabled={uploading}
            placeholder="본문을 입력하세요. 이미지를 붙여넣으면 GitHub에 업로드됩니다."
          />
        </div>
      </form>

      {localTools && (
        <ObsidianNotePicker
          open={obsidianOpen}
          onClose={() => setObsidianOpen(false)}
          onSelect={handleImportObsidian}
        />
      )}
    </article>
  )
}
