'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
} from 'react'
import styles from './CoverReferencePhotos.module.css'

export type CoverReferencePhoto = {
  id: string
  file: File
  previewUrl: string
}

type Props = {
  photos: CoverReferencePhoto[]
  onChange: (photos: CoverReferencePhoto[]) => void
  disabled?: boolean
  maxCount?: number
  /**
   * While mounted, intercept window paste when the clipboard holds an image
   * (so paste works even if focus is in a sibling title/description field).
   */
  captureWindowPaste?: boolean
}

const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif'
const MAX_COUNT_DEFAULT = 4

export function createCoverRefId() {
  return `cref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function revokeCoverReferencePhotos(photos: CoverReferencePhoto[]) {
  for (const p of photos) {
    try {
      URL.revokeObjectURL(p.previewUrl)
    } catch {
      /* ignore */
    }
  }
}

/** Collect image files from a paste/drop DataTransfer. */
export function imageFilesFromDataTransfer(
  data: DataTransfer | null | undefined,
): File[] {
  if (!data) return []
  const out: File[] = []
  const seen = new Set<string>()

  const push = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(file)
  }

  if (data.items?.length) {
    for (const item of Array.from(data.items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        push(item.getAsFile())
      }
    }
  }
  if (!out.length && data.files?.length) {
    for (const file of Array.from(data.files)) push(file)
  }
  return out
}

/** Encode attached files for /api/generate-cover. */
export async function coverRefsToPayload(photos: CoverReferencePhoto[]): Promise<
  Array<{ filename: string; contentType: string; contentBase64: string }>
> {
  const out: Array<{
    filename: string
    contentType: string
    contentBase64: string
  }> = []
  for (const photo of photos) {
    const buf = await photo.file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    out.push({
      filename: photo.file.name || `${photo.id}.png`,
      contentType: photo.file.type || 'image/png',
      contentBase64: btoa(binary),
    })
  }
  return out
}

export function CoverReferencePhotos({
  photos,
  onChange,
  disabled = false,
  maxCount = MAX_COUNT_DEFAULT,
  captureWindowPaste = false,
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef(photos)
  photosRef.current = photos
  const remaining = Math.max(0, maxCount - photos.length)
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const room = remainingRef.current
      const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'))
      if (!incoming.length || room <= 0) return
      const slice = incoming.slice(0, room)
      const prev = photosRef.current
      onChange([
        ...prev,
        ...slice.map((file) => ({
          id: createCoverRefId(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ])
    },
    [onChange],
  )

  const removeAt = useCallback(
    (id: string) => {
      const prev = photosRef.current
      const target = prev.find((p) => p.id === id)
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl)
        } catch {
          /* ignore */
        }
      }
      onChange(prev.filter((p) => p.id !== id))
    },
    [onChange],
  )

  const ingestClipboard = useCallback(
    (data: DataTransfer | null | undefined, e?: { preventDefault: () => void }) => {
      if (disabled) return false
      const files = imageFilesFromDataTransfer(data)
      if (!files.length || remainingRef.current <= 0) return false
      e?.preventDefault()
      addFiles(files)
      return true
    },
    [addFiles, disabled],
  )

  useEffect(() => {
    if (!captureWindowPaste || disabled) return
    const onPaste = (e: ClipboardEvent) => {
      ingestClipboard(e.clipboardData, e)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [captureWindowPaste, disabled, ingestClipboard])

  const onPaste = (e: ReactClipboardEvent) => {
    if (ingestClipboard(e.clipboardData, e)) {
      e.stopPropagation()
    }
  }

  const onDragOver = (e: ReactDragEvent) => {
    if (disabled || remaining <= 0) return
    if (![...e.dataTransfer.types].includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (e: ReactDragEvent) => {
    if (disabled) return
    const files = imageFilesFromDataTransfer(e.dataTransfer)
    if (!files.length) return
    e.preventDefault()
    e.stopPropagation()
    addFiles(files)
  }

  return (
    <div
      className={styles.wrap}
      onPaste={onPaste}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-cover-refs=""
    >
      <div className={styles.labelRow}>
        <span className={styles.label}>참고 사진 (선택)</span>
        <span className={styles.hint}>
          최대 {maxCount}장 · 붙여넣기/드래그 가능 · 분위기·구도·색감 참고용
        </span>
      </div>

      <div className={styles.grid}>
        {photos.map((photo) => (
          <div key={photo.id} className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.previewUrl} alt="" className={styles.img} />
            <button
              type="button"
              className={styles.remove}
              onClick={() => removeAt(photo.id)}
              disabled={disabled}
              aria-label="참고 사진 제거"
            >
              ×
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <label
            htmlFor={inputId}
            className={`${styles.add} ${disabled ? styles.addDisabled : ''}`}
            title="참고 사진 추가 (클릭 또는 붙여넣기)"
          >
            <span className={styles.addPlus}>+</span>
            <span className={styles.addText}>추가</span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPT}
              multiple
              className={styles.fileInput}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
    </div>
  )
}
