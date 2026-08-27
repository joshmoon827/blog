'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { coverPickerImages, coverLabel, coverPalette } from '@/data/covers'
import CoverPaletteThumb from '@/components/CoverPaletteThumb'
import type { ArticleData } from '@/lib/localArticles'
import { useLanguage } from '@/components/LocalizedText'
import { renderArticleBody } from '@/lib/renderArticleBody'
import {
  applyAlignToNthImage,
  applyCropToNthImage,
  BODY_IMAGE_ALIGN_OPTIONS,
  sanitizeBodyImageAlign,
  type BodyImageAlign,
  type BodyImageCrop,
} from '@/lib/bodyImageCrop'
import TistoryPreviewBody from '@/components/TistoryPreviewBody'
import type {
  BodyImageAlignRequest,
  BodyImageEditRequest,
} from '@/components/BodyImage'
import type { HybridMarkdownEditorHandle } from '@/components/HybridMarkdownEditor'
import {
  CoverReferencePhotos,
  coverRefsToPayload,
  imageFilesFromDataTransfer,
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

const BodyImageCropModal = dynamic(
  () => import('@/components/BodyImageCropModal'),
  { ssr: false },
)

interface Props {
  article: ArticleData
}

type CoverJobStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled'

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
  swissModernist?: boolean
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
    swissModernist?: boolean
    paletteColors?: string[]
    backgroundColor?: string
    referenceImages?: CoverGenOptions['referenceImages']
  } = {
    slug,
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
      swissModernist?: boolean | null
      backgroundColor?: string | null
    } | null
  }
  if (!res.ok) throw new Error('status fetch failed')
  return data
}

export default function ArticleView({ article: initial }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const language = useLanguage()
  const { authenticated } = useAuth()
  const canEdit = authenticated && isAuthoringEnabled()
  const [article, setArticle] = useState(initial)
  
  const title = language === 'en' && article.title_en ? article.title_en : article.title
  const description = language === 'en' && article.description_en ? article.description_en : article.description
  const body = language === 'en' && article.body_en ? article.body_en : article.body
  const [coverEditing, setCoverEditing] = useState(false)
  const [bodyEditing, setBodyEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [obsidianSyncing, setObsidianSyncing] = useState(false)
  const [obsidianSyncError, setObsidianSyncError] = useState('')
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
  const [coverSwissModernist, setCoverSwissModernist] = useState(true)
  const [coverBackgroundColor, setCoverBackgroundColor] = useState('')
  const [coverReferencePhotos, setCoverReferencePhotos] = useState<
    CoverReferencePhoto[]
  >([])
  const draft = useRef({ ...initial })
  const bodyRef = useRef<HybridMarkdownEditorHandle>(null)
  /** 보관(북마크/고정) 상태 — 임시저장 와 별개의 독립 플래그. */
  const [archived, setArchived] = useState(!!initial.archived)
  const [archiveToggling, setArchiveToggling] = useState(false)
  /** 글 설정 popover (보관 토글 + 표지/메타데이터 편집) 열림 여부. */
  const [settingsOpen, setSettingsOpen] = useState(false)
  const popoverAnchor = useRef<{ x: number; y: number } | null>(null)
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [imageCropEdit, setImageCropEdit] =
    useState<BodyImageEditRequest | null>(null)
  const [imageAlignMenu, setImageAlignMenu] = useState<{
    index: number
    x: number
    y: number
    align: BodyImageAlign
  } | null>(null)

  // gear 버튼이 직접 표지 편집으로 간 것을 popover 메뉴의 한 항목으로 분리.
  const openCoverEditing = useCallback(() => {
    setSettingsOpen(false)
    draft.current = { ...article }
    setCreatedValue(article.created || '')
    setDescriptionValue(article.description || '')
    setTagsValue(formatTagsInput(article.tags))
    setImageValue(article.image)
    setBodyEditing(false)
    setCoverEditing(true)
  }, [article])

  // 보관 토글 — PATCH-like PUT 병합을 통해 articles API에 반영.
  const toggleArchive = useCallback(async () => {
    if (archiveToggling) return
    const next = !archived
    setArchiveToggling(true)
    try {
      const res = await fetch(`/api/articles/${article.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: next }),
      })
      if (!res.ok) throw new Error('보관 상태 저장 실패')
      setArchived(next)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setArchiveToggling(false)
    }
  }, [article.slug, archived, archiveToggling])

  const [deleting, setDeleting] = useState(false)

  const handleDeleteArticle = useCallback(async () => {
    if (deleting) return
    const ok = confirm(
      `「${article.title || article.slug}」을(를) 휴지통으로 보낼까요?`,
    )
    if (!ok) return
    setDeleting(true)
    setSettingsOpen(false)
    try {
      const res = await fetch(`/api/articles/${article.slug}`, {
        method: 'DELETE',
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || `삭제 실패 (${res.status})`)
      }
      router.push('/')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
      setDeleting(false)
    }
  }, [article.slug, article.title, deleting, router])

  // 설정 popover 바깥 클릭 / Esc 시 닫기.
  useEffect(() => {
    if (!settingsOpen) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (!popoverRef.current || !popoverRef.current.contains(target)) {
        setSettingsOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('mousedown', handleOutside, true)
    window.addEventListener('touchstart', handleOutside, true)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleOutside, true)
      window.removeEventListener('touchstart', handleOutside, true)
      window.removeEventListener('keydown', handleKey)
    }
  }, [settingsOpen])

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => revokeCoverReferencePhotos(coverReferencePhotos)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke latest list on unmount
  }, [])

  /** Metadata/cover edit: paste image → upload as cover when ref-photos didn't take it. */
  useEffect(() => {
    if (!coverEditing || !canEdit) return
    const onPaste = (e: ClipboardEvent) => {
      const files = imageFilesFromDataTransfer(e.clipboardData)
      if (!files.length) return
      // CoverReferencePhotos window listener handles paste when it has room.
      if (isLocalToolsEnabled() && coverReferencePhotos.length < 4) return
      e.preventDefault()
      const file = files[0]
      void (async () => {
        setUploading(true)
        try {
          const url = await uploadImageFile(file)
          draft.current.image = url
          setImageValue(url)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          alert('이미지 업로드 실패: ' + msg)
        } finally {
          setUploading(false)
        }
      })()
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [canEdit, coverEditing, coverReferencePhotos.length])

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
      swissModernist?: boolean | null
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
      if (typeof job.swissModernist === 'boolean') {
        setCoverSwissModernist(job.swissModernist)
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
      if (status === 'cancelled') {
        setCoverStatus('cancelled')
        setCoverMessage(data.error || '표지 생성을 취소했습니다.')
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
        } else if (data.status === 'cancelled') {
          setCoverStatus('cancelled')
          setCoverMessage(data.error || '표지 생성을 취소했습니다.')
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
      swissModernist: coverSwissModernist,
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

  const handleCancelCoverGeneration = async () => {
    if (coverStatus !== 'running') return
    setCoverMessage('표지 생성 취소 중…')
    try {
      const res = await fetch(
        `/api/generate-cover?slug=${encodeURIComponent(article.slug)}`,
        { method: 'DELETE' },
      )
      const data = (await res.json()) as {
        error?: string
        status?: string
        cancelled?: boolean
      }
      if (!res.ok) {
        throw new Error(data.error || `Cancel failed (${res.status})`)
      }
      stopPolling()
      setCoverStatus('cancelled')
      setCoverMessage('표지 생성을 취소했습니다.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCoverStatus('error')
      setCoverMessage('표지 생성 취소 실패: ' + msg)
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
      // IMPORTANT: bodyValue always contains the Korean body being edited
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
    // Always reset to the Korean body
    setBodyValue(article.body)
    draft.current.body = article.body
    setBodyEditing(false)
  }

  const handleEditBodyImage = useCallback((req: BodyImageEditRequest) => {
    if (!canEdit || bodyEditing) return
    setImageAlignMenu(null)
    setImageCropEdit(req)
  }, [canEdit, bodyEditing])

  const persistBody = useCallback(
    async (nextBody: string, failLabel: string) => {
      setSaving(true)
      try {
        const payload = { ...article, body: nextBody }
        const res = await fetch(`/api/articles/${article.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Save failed')
        const updated = (await res.json()) as ArticleData
        setArticle(updated)
        setBodyValue(updated.body)
        draft.current.body = updated.body
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        return true
      } catch (e) {
        alert(`${failLabel}: ` + e)
        return false
      } finally {
        setSaving(false)
      }
    },
    [article],
  )

  const handleApplyBodyImageCrop = useCallback(
    async (crop: BodyImageCrop) => {
      if (!imageCropEdit) return
      // IMPORTANT: Always apply crop to the Korean body, never the displayed English
      const nextBody = applyCropToNthImage(
        article.body,
        imageCropEdit.index,
        crop,
      )
      if (nextBody == null) {
        alert('이미지를 본문에서 찾지 못했습니다.')
        return
      }
      const ok = await persistBody(nextBody, '이미지 크롭 저장 실패')
      if (ok) setImageCropEdit(null)
    },
    [article.body, imageCropEdit, persistBody],
  )

  const handleAlignBodyImage = useCallback(
    async (req: BodyImageAlignRequest) => {
      if (!canEdit || bodyEditing) return
      // IMPORTANT: Always apply alignment to the Korean body, never the displayed English
      const nextBody = applyAlignToNthImage(
        article.body,
        req.index,
        req.align,
      )
      if (nextBody == null) {
        alert('이미지를 본문에서 찾지 못했습니다.')
        return
      }
      setImageAlignMenu(null)
      await persistBody(nextBody, '이미지 정렬 저장 실패')
    },
    [article.body, bodyEditing, canEdit, persistBody],
  )

  /** Tistory HTML read view: dblclick img → crop; contextmenu → align. */
  const resolveTistoryImageIndex = (
    root: HTMLElement,
    img: HTMLImageElement,
  ) => {
    const imgs = Array.from(root.querySelectorAll('img'))
    return imgs.indexOf(img)
  }

  const handleTistoryImageDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (!canEdit || bodyEditing) return
      const t = e.target as HTMLElement | null
      const img = t?.closest?.('img') as HTMLImageElement | null
      if (!img) return
      const index = resolveTistoryImageIndex(e.currentTarget, img)
      if (index < 0) return
      e.preventDefault()
      const ds = img.dataset
      setImageCropEdit({
        index,
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || '',
        align: sanitizeBodyImageAlign(ds.align || ds.keAlign || ds.keStyle),
        crop:
          ds.cropScale || ds.cropPos || ds.cropRotate || ds.padColor
            ? {
                scale: Number(ds.cropScale || 1),
                position: ds.cropPos || '50% 50%',
                rotation: Number(ds.cropRotate || 0),
                padColor: ds.padColor,
                aspectRatio: ds.cropAspect,
              }
            : null,
      })
    },
    [canEdit, bodyEditing],
  )

  const handleTistoryImageContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (!canEdit || bodyEditing) return
      const t = e.target as HTMLElement | null
      const img = t?.closest?.('img') as HTMLImageElement | null
      if (!img) return
      const index = resolveTistoryImageIndex(e.currentTarget, img)
      if (index < 0) return
      e.preventDefault()
      const ds = img.dataset
      setImageAlignMenu({
        index,
        x: e.clientX,
        y: e.clientY,
        align: sanitizeBodyImageAlign(ds.align || ds.keAlign || ds.keStyle),
      })
    },
    [canEdit, bodyEditing],
  )

  useEffect(() => {
    if (!imageAlignMenu) return
    const close = () => setImageAlignMenu(null)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [imageAlignMenu])

  const fetchObsidianNote = async (sourcePath: string) => {
    const res = await fetch(
      `/api/obsidian/notes?path=${encodeURIComponent(sourcePath)}`,
    )
    const data = (await res.json()) as {
      note?: {
        title?: string
        description?: string
        created?: string
        tags?: string[]
        body?: string
        path?: string
        imageUpload?: { errors?: string[] }
      }
      error?: string
    }
    const note = data.note
    if (!res.ok || !note || typeof note.body !== 'string') {
      throw new Error(data.error || `불러오기 실패 (${res.status})`)
    }
    const errors = note.imageUpload?.errors
    if (errors?.length) {
      console.warn('[obsidian sync] image issues:', errors)
    }
    return { ...note, body: note.body }
  }

  const handleObsidianSync = async () => {
    const sourcePath = article.sourcePath?.trim()
    if (!sourcePath) {
      alert('이 글에 연결된 옵시디언 경로가 없습니다.')
      return
    }
    if (
      !window.confirm(
        '옵시디언 노트에서 최신 본문을 가져와 편집기에 넣습니다.\n(아직 저장되지 않으며, 확인 후 저장을 눌러 주세요.)',
      )
    ) {
      return
    }

    setObsidianSyncing(true)
    try {
      const note = await fetchObsidianNote(sourcePath)
      syncBody(note.body)
      requestAnimationFrame(() => bodyRef.current?.focus())
    } catch (e) {
      alert(
        '옵시디언 동기화 실패: ' +
          (e instanceof Error ? e.message : String(e)),
      )
    } finally {
      setObsidianSyncing(false)
    }
  }

  const handleNoteUpdate = async () => {
    const sourcePath = article.sourcePath?.trim()
    if (!sourcePath) {
      setObsidianSyncError('이 글에 연결된 옵시디언 경로가 없습니다.')
      return
    }

    setObsidianSyncError('')
    setObsidianSyncing(true)
    try {
      const note = await fetchObsidianNote(sourcePath)
      const payload: ArticleData = {
        ...article,
        title: note.title?.trim() || article.title,
        description: note.description ?? '',
        created: note.created || article.created,
        tags: note.tags || [],
        body: note.body,
        format: 'obsidian',
        sourcePath: note.path || sourcePath,
      }
      const saveRes = await fetch(`/api/articles/${article.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!saveRes.ok) throw new Error(`저장 실패 (${saveRes.status})`)
      const updated = (await saveRes.json()) as ArticleData
      setArticle(updated)
      draft.current = { ...updated }
      setBodyValue(updated.body)
      setCreatedValue(updated.created || '')
      setDescriptionValue(updated.description || '')
      setTagsValue(formatTagsInput(updated.tags))
      setImageValue(updated.image)
      setCoverEditing(false)
      setBodyEditing(false)
      setSettingsOpen(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } catch (e) {
      setObsidianSyncError(e instanceof Error ? e.message : String(e))
    } finally {
      setObsidianSyncing(false)
    }
  }

  const enterBodyEditing = useCallback(() => {
    setCoverEditing(false)
    // Always edit the Korean body, never the displayed English translation
    setBodyValue(article.body)
    draft.current.body = article.body
    setBodyEditing(true)
    requestAnimationFrame(() => bodyRef.current?.focus())
  }, [article.body])

  const exitBodyEditing = useCallback(() => {
    // Always reset to the Korean body
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
        alt={title}
        priority
        headerOverlay
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
            {localTools && obsidianSyncing && !bodyEditing && (
              <span className={styles.savedBadge}>노트 업데이트 중…</span>
            )}
            {localTools && generatingCover && (
              <>
                <span className={styles.savedBadge}>표지 생성 중…</span>
                {canEdit && (
                  <button
                    type="button"
                    className={styles.btnCancelCover}
                    onClick={handleCancelCoverGeneration}
                    title="백그라운드 표지 생성 취소"
                  >
                    생성 취소
                  </button>
                )}
              </>
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
                <button
                  className={styles.btnCancel}
                  onClick={handleBodyCancel}
                  disabled={uploading || obsidianSyncing}
                >
                  취소
                </button>
                {localTools && article.sourcePath ? (
                  <button
                    type="button"
                    className={styles.btnObsidianSync}
                    onClick={handleObsidianSync}
                    disabled={saving || uploading || obsidianSyncing}
                    title={article.sourcePath}
                  >
                    {obsidianSyncing ? '동기화 중…' : '옵시디언 업데이트'}
                  </button>
                ) : null}
                <button
                  className={styles.btnSave}
                  onClick={handleBodySave}
                  disabled={saving || uploading || obsidianSyncing}
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
              </>
            ) : canEdit ? (
              <button
                type="button"
                ref={settingsBtnRef}
                className={styles.btnSettings}
                aria-haspopup="true"
                aria-expanded={settingsOpen}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                  let x = rect.right - 240
                  if (typeof window !== 'undefined') {
                    x = Math.min(x, window.innerWidth - 16 - 240)
                  }
                  popoverAnchor.current = { x: Math.max(16, x), y: rect.bottom + 8 }
                  setSettingsOpen(true)
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

        {settingsOpen && popoverAnchor.current ? (
          <div
            className={styles.settingsPopover}
            ref={popoverRef}
            style={{ left: `${popoverAnchor.current?.x ?? 0}px`, top: `${popoverAnchor.current?.y ?? 0}px` }}
            role="menu"
            aria-orientation="vertical"
            tabIndex={-1}
          >
            <ul className={styles.settingsMenu}>
              <li>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={archived}
                  disabled={archiveToggling}
                  className={`${styles.settingsRow} ${archived ? styles.settingsRowActive : ''}`}
                  onClick={toggleArchive}
                >
                  <svg width="16" height="15" viewBox="0 0 24 24" fill={archived ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M19 21l-7-5-7 5V5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3z" />
                  </svg>
                  <span className={styles.settingsRowLabel}>보관</span>
                  {archived ? (
                    <span className={styles.settingsRowStatus}>보관됨</span>
                  ) : null}
                </button>
              </li>
              <li>
                <hr className={styles.settingsDivider} aria-hidden="true" />
              </li>
              <li>
                <button type="button" role="menuitem" className={styles.settingsRow} onClick={openCoverEditing}>
                  <svg width="16" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 17.2V21h3.8l9.4-9.4-3.8-3.8L3 14.5v2.7z" />
                    <path d="M20.7 6a2 2 0 0 0 .5-1V3.6c0-.7-.5-1.2-1.2-.9l-3 1.2" />
                  </svg>
                  <span className={styles.settingsRowLabel}>표지·메타데이터 편집</span>
                </button>
              </li>
              {localTools && article.sourcePath ? (
                <>
                  <li>
                    <hr className={styles.settingsDivider} aria-hidden="true" />
                  </li>
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.settingsRow}
                      onClick={handleNoteUpdate}
                      disabled={obsidianSyncing || saving || uploading}
                      title={article.sourcePath}
                      aria-busy={obsidianSyncing}
                    >
                      <svg width="16" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                        <path d="M21 3v6h-6" />
                      </svg>
                      <span className={styles.settingsRowLabel}>노트 업데이트</span>
                      {obsidianSyncing ? (
                        <span className={styles.settingsRowStatus}>업데이트 중…</span>
                      ) : null}
                    </button>
                    {obsidianSyncError ? (
                      <p className={styles.settingsRowError} role="alert">
                        {obsidianSyncError}
                      </p>
                    ) : null}
                  </li>
                </>
              ) : null}
              <li>
                <hr className={styles.settingsDivider} aria-hidden="true" />
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.settingsRow} ${styles.settingsRowDanger}`}
                  onClick={handleDeleteArticle}
                  disabled={deleting}
                >
                  <svg width="16" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  <span className={styles.settingsRowLabel}>
                    {deleting ? '삭제 중…' : '휴지통으로'}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        ) : null}

        {localTools &&
          (coverStatus === 'running' ||
            coverStatus === 'error' ||
            coverStatus === 'success' ||
            coverStatus === 'cancelled') &&
          coverMessage && (
            <div
              className={
                coverStatus === 'error'
                  ? styles.coverGenBannerError
                  : coverStatus === 'success'
                    ? styles.coverGenBannerOk
                    : coverStatus === 'cancelled'
                      ? styles.coverGenBannerCancelled
                      : styles.coverGenBanner
              }
              role="status"
            >
              <span>{coverMessage}</span>
              {canEdit && coverStatus === 'running' && (
                <span className={styles.coverGenErrorActions}>
                  <button
                    type="button"
                    className={styles.coverGenRetry}
                    onClick={handleCancelCoverGeneration}
                  >
                    생성 취소
                  </button>
                </span>
              )}
              {canEdit && (coverStatus === 'error' || coverStatus === 'cancelled') && (
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
          <h1 className={styles.title}>{title}</h1>
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
                    captureWindowPaste
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
                    <label
                      className={styles.coverAutoCheck}
                      title="스위스 모더니스트 추상 로고형 아트 디렉션을 표지 프롬프트에 포함 (기본 ON)"
                    >
                      <input
                        type="checkbox"
                        checked={coverSwissModernist}
                        onChange={(e) => setCoverSwissModernist(e.target.checked)}
                        disabled={generatingCover || uploading || saving}
                      />
                      <span>스위스 모더니스트 아트 디렉션</span>
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
                    {generatingCover && (
                      <button
                        type="button"
                        className={styles.btnCancelCover}
                        onClick={handleCancelCoverGeneration}
                        disabled={uploading || saving}
                        title="백그라운드 표지 생성 취소"
                      >
                        생성 취소
                      </button>
                    )}
                    {(coverStatus === 'error' || coverStatus === 'cancelled') && (
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
                        coverStatus === 'error'
                          ? styles.coverGenError
                          : coverStatus === 'cancelled'
                            ? styles.coverGenCancelled
                            : styles.coverGenStatus
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
            {description ? (
              <p className={styles.description}>{description}</p>
            ) : null}
          </div>
        )}

        <hr className={styles.divider} />

        {(() => {
          const format = resolveArticleFormat(article.format)
          const isTistory = format === 'tistory'
          const imageEditable = canEdit && !bodyEditing
          if (isTistory && !(canEdit && bodyEditing)) {
            return (
              <div
                className={imageEditable ? styles.bodyImageEditableHost : undefined}
                onDoubleClick={
                  imageEditable ? handleTistoryImageDoubleClick : undefined
                }
                onContextMenu={
                  imageEditable ? handleTistoryImageContextMenu : undefined
                }
              >
                <TistoryPreviewBody
                  html={body}
                  hydrate={false}
                />
              </div>
            )
          }
          return (
            <div
              className={`article-body ${styles.body} ${formatBodyClassName(format)}`}
              data-format={format}
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
                renderArticleBody(body, {
                  imageClassName: styles.bodyImage,
                  format: article.format,
                  editableImages: imageEditable,
                  onEditImage: handleEditBodyImage,
                  onAlignImage: handleAlignBodyImage,
                })
              )}
            </div>
          )
        })()}

        {!bodyEditing && !coverEditing ? (
          <div className={styles.commentsHost}>
            <CommentsSection articleSlug={article.slug} />
          </div>
        ) : null}
      </div>

      {imageCropEdit ? (
        <BodyImageCropModal
          src={imageCropEdit.src}
          alt={imageCropEdit.alt}
          initialCrop={imageCropEdit.crop}
          onClose={() => setImageCropEdit(null)}
          onApply={handleApplyBodyImageCrop}
        />
      ) : null}

      {imageAlignMenu ? (
        <div
          className={styles.imageAlignMenu}
          style={{ left: imageAlignMenu.x, top: imageAlignMenu.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p className={styles.imageAlignMenuTitle}>이미지 정렬</p>
          {BODY_IMAGE_ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="menuitemradio"
              aria-checked={imageAlignMenu.align === opt.id}
              className={`${styles.imageAlignMenuItem}${
                imageAlignMenu.align === opt.id
                  ? ` ${styles.imageAlignMenuItemActive}`
                  : ''
              }`}
              onClick={() =>
                void handleAlignBodyImage({
                  index: imageAlignMenu.index,
                  align: opt.id,
                })
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}
