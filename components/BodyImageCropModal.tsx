'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { probeCoverBorder } from '@/lib/coverBorderColor'
import {
  BODY_IMAGE_FRAME_MULT_MAX,
  BODY_IMAGE_FRAME_MULT_MIN,
  BODY_IMAGE_SCALE_MAX,
  BODY_IMAGE_SCALE_MIN,
  formatAspectRatioParts,
  frameAspectMultipliers,
  parseAspectRatioParts,
  sanitizeBodyImageCrop,
  type BodyImageCrop,
} from '@/lib/bodyImageCrop'
import { toDisplayImageUrl } from '@/lib/renderArticleBody'
import styles from './BodyImageCropModal.module.css'

type Props = {
  src: string
  alt: string
  initialCrop?: BodyImageCrop | null
  onApply: (crop: BodyImageCrop) => void | Promise<void>
  onClose: () => void
}

type Drag =
  | {
      kind: 'pan'
      originX: number
      originY: number
      startClientX: number
      startClientY: number
    }
  | {
      kind: 'scale'
      originScale: number
      centerX: number
      centerY: number
      startDist: number
    }
  | {
      kind: 'rotate'
      originRotation: number
      centerX: number
      centerY: number
      startAngle: number
    }

function parsePos(raw: string | undefined): { x: number; y: number } {
  const t = (raw ?? '50% 50%').trim()
  const parts = t.split(/\s+/)
  const num = (s: string | undefined, fallback: number) => {
    if (!s) return fallback
    const m = s.match(/(-?\d+(?:\.\d+)?)%?/)
    if (!m) return fallback
    return Math.min(100, Math.max(0, Number(m[1])))
  }
  if (parts.length === 1) return { x: num(parts[0], 50), y: 50 }
  return { x: num(parts[0], 50), y: num(parts[1], 50) }
}

function formatPos(x: number, y: number): string {
  return `${Math.round(x * 10) / 10}% ${Math.round(y * 10) / 10}%`
}

function toHex(raw: string | undefined): string {
  const c = raw?.trim() ?? ''
  const m = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (m) {
    return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
  }
  if (/^#[0-9a-f]{6}$/i.test(c)) return c
  return '#e9e9e9'
}

function parseAspect(raw: string | undefined): number {
  const { w, h } = parseAspectRatioParts(raw, 16, 10)
  return w / h
}

function clampFrameMult(n: number) {
  return Math.min(
    BODY_IMAGE_FRAME_MULT_MAX,
    Math.max(BODY_IMAGE_FRAME_MULT_MIN, n),
  )
}

/**
 * Full original bitmap box that matches CSS
 * `object-fit: cover` + `transform: scale(s)` inside a Fw×Fh frame.
 */
function coverScaledSize(
  frameW: number,
  frameH: number,
  naturalW: number,
  naturalH: number,
  scale: number,
): { w: number; h: number } {
  if (frameW <= 0 || frameH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { w: frameW, h: frameH }
  }
  const cover = Math.max(frameW / naturalW, frameH / naturalH)
  return {
    w: naturalW * cover * scale,
    h: naturalH * cover * scale,
  }
}

/** Same visual transform BodyImage applies on the cropped <img>. */
function bodyImageCropImgStyle(crop: BodyImageCrop): CSSProperties {
  return {
    objectFit: 'cover',
    objectPosition: crop.position,
    transform: `scale(${crop.scale}) rotate(${crop.rotation}deg)`,
    transformOrigin: crop.position,
    background: crop.padColor || '#e9e9e9',
  }
}

export default function BodyImageCropModal({
  src,
  alt,
  initialCrop,
  onApply,
  onClose,
}: Props) {
  const displaySrc = toDisplayImageUrl(src)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const [crop, setCrop] = useState(() =>
    sanitizeBodyImageCrop(
      initialCrop ?? { scale: 1, position: '50% 50%', rotation: 0 },
    ),
  )
  const [saving, setSaving] = useState(false)
  const [sampling, setSampling] = useState(false)
  const [natural, setNatural] = useState({ w: 1600, h: 1000 })
  const [framePx, setFramePx] = useState({ w: 0, h: 0 })
  const [frameMult, setFrameMult] = useState({ w: 1, h: 1 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const nw = img.naturalWidth
        const nh = img.naturalHeight
        setNatural({ w: nw, h: nh })
        const parts = parseAspectRatioParts(
          initialCrop?.aspectRatio ?? crop.aspectRatio,
          nw,
          nh,
        )
        setFrameMult(frameAspectMultipliers(parts, nw, nh))
        const a = formatAspectRatioParts(parts.w, parts.h)
        setCrop((c) =>
          c.aspectRatio ? c : sanitizeBodyImageCrop({ ...c, aspectRatio: a }),
        )
      }
    }
    img.src = displaySrc
  }, [displaySrc, initialCrop?.aspectRatio])

  const aspect = formatAspectRatioParts(
    natural.w * frameMult.w,
    natural.h * frameMult.h,
  )

  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setFramePx({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspect, natural.w, natural.h])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (crop.padColor) return
      setSampling(true)
      try {
        const probe = await probeCoverBorder(displaySrc, {
          displayAspect: parseAspect(aspect),
        })
        const color = probe?.padColor || probe?.dominant || probe?.average
        if (!cancelled && color) {
          setCrop((c) => sanitizeBodyImageCrop({ ...c, padColor: color }))
        }
      } finally {
        if (!cancelled) setSampling(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySrc])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pos = parsePos(crop.position)
  const ghostSize = coverScaledSize(
    framePx.w,
    framePx.h,
    natural.w,
    natural.h,
    crop.scale,
  )
  const ghostLeft = framePx.w * (pos.x / 100) - ghostSize.w * (pos.x / 100)
  const ghostTop = framePx.h * (pos.y / 100) - ghostSize.h * (pos.y / 100)

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.kind === 'pan') {
      const el = frameRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const dx = ((e.clientX - drag.startClientX) / rect.width) * 100
      const dy = ((e.clientY - drag.startClientY) / rect.height) * 100
      setCrop((c) =>
        sanitizeBodyImageCrop({
          ...c,
          position: formatPos(drag.originX - dx, drag.originY - dy),
        }),
      )
      return
    }
    if (drag.kind === 'scale') {
      const dist = Math.hypot(e.clientX - drag.centerX, e.clientY - drag.centerY)
      if (drag.startDist <= 1) return
      let next = drag.originScale * (dist / drag.startDist)
      next = Math.min(
        BODY_IMAGE_SCALE_MAX,
        Math.max(BODY_IMAGE_SCALE_MIN, next),
      )
      if (e.shiftKey) next = Math.round(next * 4) / 4
      setCrop((c) =>
        sanitizeBodyImageCrop({ ...c, scale: Math.round(next * 100) / 100 }),
      )
      return
    }
    const angle = Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX)
    let next =
      drag.originRotation + ((angle - drag.startAngle) * 180) / Math.PI
    if (e.shiftKey) next = Math.round(next / 15) * 15
    setCrop((c) => sanitizeBodyImageCrop({ ...c, rotation: next }))
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current = null
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [onPointerMove, endDrag])

  const startPan = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    dragRef.current = {
      kind: 'pan',
      originX: pos.x,
      originY: pos.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
    }
  }

  const startScale = (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    dragRef.current = {
      kind: 'scale',
      originScale: crop.scale,
      centerX,
      centerY,
      startDist: Math.max(
        Math.hypot(e.clientX - centerX, e.clientY - centerY),
        8,
      ),
    }
  }

  const startRotate = (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    dragRef.current = {
      kind: 'rotate',
      originRotation: crop.rotation,
      centerX,
      centerY,
      startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
    }
  }

  const pickEyedropper = async () => {
    type EyeDropperCtor = new () => {
      open: () => Promise<{ sRGBHex: string }>
    }
    const Api = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
    if (!Api) return
    try {
      const result = await new Api().open()
      if (result.sRGBHex) {
        setCrop((c) =>
          sanitizeBodyImageCrop({ ...c, padColor: result.sRGBHex }),
        )
      }
    } catch {
      /* cancel */
    }
  }

  const resamplePad = async () => {
    setSampling(true)
    try {
      const probe = await probeCoverBorder(displaySrc, {
        displayAspect: parseAspect(aspect),
      })
      const color = probe?.padColor || probe?.dominant || probe?.average
      if (color) {
        setCrop((c) => sanitizeBodyImageCrop({ ...c, padColor: color }))
      }
    } finally {
      setSampling(false)
    }
  }

  const apply = async () => {
    setSaving(true)
    try {
      await onApply(
        sanitizeBodyImageCrop({
          ...crop,
          aspectRatio: aspect,
        }),
      )
    } finally {
      setSaving(false)
    }
  }

  const setFrameWidthMult = (next: number) => {
    setFrameMult((m) => ({ ...m, w: clampFrameMult(next) }))
  }

  const setFrameHeightMult = (next: number) => {
    setFrameMult((m) => ({ ...m, h: clampFrameMult(next) }))
  }

  const resultImgStyle = bodyImageCropImgStyle(crop)

  if (!mounted) return null

  return createPortal(
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 크롭"
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>이미지 크롭</h2>
          <p className={styles.hint}>
            파란 프레임 = 저장 후 크기·구도. 바깥은 원본(어둡게). 드래그 이동 ·
            우하단 크기 · 우상단 회전 · 슬라이더로 프레임 가로·세로 조절
          </p>
        </header>

        <div className={styles.stage}>
          <div
            className={styles.workspace}
            style={{ background: crop.padColor || '#e9e9e9' }}
            onPointerDown={startPan}
          >
            {/* Veil on the original photo (dimmed full bitmap spilling outside) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.ghost}
              src={displaySrc}
              alt=""
              draggable={false}
              aria-hidden
              style={{
                width: ghostSize.w || undefined,
                height: ghostSize.h || undefined,
                left: ghostLeft,
                top: ghostTop,
                transform: `rotate(${crop.rotation}deg)`,
                transformOrigin: `${pos.x}% ${pos.y}%`,
              }}
            />

            {/* WYSIWYG result — identical CSS to BodyImage after apply */}
            <div
              ref={frameRef}
              className={styles.frame}
              style={{
                aspectRatio: aspect.replace(/\s+/g, ''),
                background: crop.padColor || '#e9e9e9',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.frameImg}
                src={displaySrc}
                alt={alt || ''}
                draggable={false}
                style={resultImgStyle}
              />
              <button
                type="button"
                className={styles.rotateHandle}
                title="회전"
                aria-label="회전"
                onPointerDown={startRotate}
              />
              <button
                type="button"
                className={styles.scaleHandle}
                title="크기"
                aria-label="크기"
                onPointerDown={startScale}
              />
            </div>
          </div>
        </div>

        <div className={styles.controls}>
          <label className={styles.row}>
            <span>프레임 가로 {Math.round(frameMult.w * 100)}%</span>
            <input
              type="range"
              min={BODY_IMAGE_FRAME_MULT_MIN}
              max={BODY_IMAGE_FRAME_MULT_MAX}
              step={0.01}
              value={frameMult.w}
              onChange={(e) => setFrameWidthMult(Number(e.target.value))}
            />
          </label>
          <label className={styles.row}>
            <span>프레임 세로 {Math.round(frameMult.h * 100)}%</span>
            <input
              type="range"
              min={BODY_IMAGE_FRAME_MULT_MIN}
              max={BODY_IMAGE_FRAME_MULT_MAX}
              step={0.01}
              value={frameMult.h}
              onChange={(e) => setFrameHeightMult(Number(e.target.value))}
            />
          </label>
          <label className={styles.row}>
            <span>크기 {Math.round(crop.scale * 100)}%</span>
            <input
              type="range"
              min={BODY_IMAGE_SCALE_MIN}
              max={BODY_IMAGE_SCALE_MAX}
              step={0.01}
              value={crop.scale}
              onChange={(e) =>
                setCrop((c) =>
                  sanitizeBodyImageCrop({
                    ...c,
                    scale: Number(e.target.value),
                  }),
                )
              }
            />
          </label>
          <label className={styles.row}>
            <span>회전 {crop.rotation.toFixed(0)}°</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={crop.rotation}
              onChange={(e) =>
                setCrop((c) =>
                  sanitizeBodyImageCrop({
                    ...c,
                    rotation: Number(e.target.value),
                  }),
                )
              }
            />
          </label>
          <div className={styles.padRow}>
            <span>배경</span>
            <input
              type="color"
              value={toHex(crop.padColor)}
              onChange={(e) =>
                setCrop((c) =>
                  sanitizeBodyImageCrop({ ...c, padColor: e.target.value }),
                )
              }
              aria-label="배경색"
            />
            <button
              type="button"
              className={styles.btn}
              onClick={() => void pickEyedropper()}
            >
              스포이드
            </button>
            <button
              type="button"
              className={styles.btn}
              disabled={sampling}
              onClick={() => void resamplePad()}
            >
              {sampling ? '…' : '자동'}
            </button>
          </div>
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btn}
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => void apply()}
            disabled={saving}
          >
            {saving ? '저장 중…' : '적용 · 저장'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
