'use client'

import { useCallback, useId, useRef } from 'react'
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
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const remaining = Math.max(0, maxCount - photos.length)

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'))
      if (!incoming.length || remaining <= 0) return
      const slice = incoming.slice(0, remaining)
      const next = [
        ...photos,
        ...slice.map((file) => ({
          id: createCoverRefId(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]
      onChange(next)
    },
    [onChange, photos, remaining],
  )

  const removeAt = useCallback(
    (id: string) => {
      const target = photos.find((p) => p.id === id)
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl)
        } catch {
          /* ignore */
        }
      }
      onChange(photos.filter((p) => p.id !== id))
    },
    [onChange, photos],
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.labelRow}>
        <span className={styles.label}>참고 사진 (선택)</span>
        <span className={styles.hint}>
          최대 {maxCount}장 · 원하는 분위기·구도·색감 참고용
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
            title="참고 사진 추가"
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
