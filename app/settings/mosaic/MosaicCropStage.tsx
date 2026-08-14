'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  mosaicCoverBitmapSize,
  mosaicDimOverlayClipPath,
  mosaicPieceRotation,
  mosaicPieceScale,
  polygonCss,
  type MosaicPiece,
} from '@/lib/mosaicPattern'
import styles from './mosaic-editor.module.css'

type Props = {
  piece: MosaicPiece
  imageSrc: string
  padHex: string
  samplingPad: boolean
  parseObjectPosition: (raw: string | undefined) => { x: number; y: number }
  onPan: (e: ReactPointerEvent) => void
  onRotate: (
    e: ReactPointerEvent,
    pivot: { x: number; y: number },
  ) => void
  onScale: (
    e: ReactPointerEvent,
    pivot: { x: number; y: number },
  ) => void
  onPadColor: (hex: string) => void
  onEyedropper: () => void
  onAutoPad: () => void
}

/**
 * Crop: full original as a natural-aspect rectangle.
 * Shrink/grow changes that rectangle only — pad stays outside the photo, never inset.
 * Rotate = top-right, Scale = bottom-right of the photo box.
 */
export default function MosaicCropStage({
  piece,
  imageSrc,
  padHex,
  samplingPad,
  parseObjectPosition,
  onPan,
  onRotate,
  onScale,
  onPadColor,
  onEyedropper,
  onAutoPad,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [natural, setNatural] = useState({ w: 1600, h: 1000 })
  const [framePx, setFramePx] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNatural({ w: img.naturalWidth, h: img.naturalHeight })
      }
    }
    img.src = imageSrc
  }, [imageSrc])

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setFramePx({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = mosaicPieceScale(piece)
  const rotation = mosaicPieceRotation(piece)
  const pos = parseObjectPosition(piece.objectPosition)
  const fit = piece.objectFit === 'contain' ? 'contain' : 'cover'
  const rigSize = mosaicCoverBitmapSize(
    framePx.w,
    framePx.h,
    natural.w,
    natural.h,
    scale,
    fit,
  )
  const rigLeft = framePx.w * (pos.x / 100) - rigSize.w * (pos.x / 100)
  const rigTop = framePx.h * (pos.y / 100) - rigSize.h * (pos.y / 100)
  const origin = `${pos.x}% ${pos.y}%`

  const rigStyle: CSSProperties = {
    width: rigSize.w || undefined,
    height: rigSize.h || undefined,
    left: rigLeft,
    top: rigTop,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: origin,
  }

  const bitmapStyle: CSSProperties = {
    ...rigStyle,
    position: 'absolute',
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'fill',
    margin: 0,
    padding: 0,
    border: 'none',
    display: 'block',
    pointerEvents: 'none',
  }

  const pivotFromEvent = () => {
    const host = hostRef.current?.getBoundingClientRect()
    if (!host || !rigSize.w || !rigSize.h) return null
    return {
      x: host.left + rigLeft + (rigSize.w * pos.x) / 100,
      y: host.top + rigTop + (rigSize.h * pos.y) / 100,
    }
  }

  return (
    <div ref={hostRef} className={styles.cropStageWrap}>
      <button
        type="button"
        className={styles.cropStage}
        style={{ zIndex: 50, backgroundColor: piece.padColor || padHex }}
        aria-label={`${piece.label} 이미지 크롭 — 드래그로 이동`}
        title="원본 사각형만 줄이고 늘립니다 · 배경은 사진 밖 여백만"
        onPointerDown={onPan}
      >
        <span className={styles.cropBadge}>CROP</span>

        {/* Dimmed full original — pad is only outside this bitmap */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.cropGhost}
          src={imageSrc}
          alt=""
          draggable={false}
          aria-hidden
          style={{ ...bitmapStyle, zIndex: 1, filter: 'brightness(0.42)' }}
        />

        {/* Soft veil outside the mosaic polygon */}
        <div
          className={styles.cropVeil}
          style={{ clipPath: mosaicDimOverlayClipPath(piece.points) }}
          aria-hidden
        />

        {/*
          Bright result = same original rectangle, clipped to the shard.
          No object-fit:cover + scale (that letterboxes pad into a cropped cover).
        */}
        <div
          className={styles.cropResult}
          style={{
            clipPath: polygonCss(piece.points),
            backgroundColor: piece.padColor || padHex,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            style={bitmapStyle}
          />
        </div>

        <svg
          className={styles.cropFrameSvg}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polygon
            points={piece.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(14, 165, 233, 0.85)"
            strokeWidth="0.55"
            strokeDasharray="1.2 1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div
          data-crop-rig="1"
          className={styles.cropImageControls}
          style={rigStyle}
        >
          <span className={styles.cropImageBorder} aria-hidden />
          <button
            type="button"
            data-mosaic-handle="1"
            className={styles.cropRotateHandle}
            aria-label="이미지 회전"
            title="드래그로 회전 (Shift: 15°)"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const pivot = pivotFromEvent()
              if (!pivot) return
              onRotate(e, pivot)
            }}
          />
          <button
            type="button"
            data-mosaic-handle="1"
            className={styles.cropScaleHandle}
            aria-label="이미지 크기"
            title="드래그로 크기 조절 (Shift: 25% 단위)"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const pivot = pivotFromEvent()
              if (!pivot) return
              onScale(e, pivot)
            }}
          />
        </div>
      </button>

      <div className={styles.cropPadBar} data-mosaic-handle="1">
        <span className={styles.cropPadLabel}>배경</span>
        <label className={styles.cropPadSwatchWrap} title="배경색 선택">
          <input
            type="color"
            className={styles.cropPadSwatch}
            value={padHex}
            onChange={(e) => onPadColor(e.target.value)}
            aria-label="배경색"
          />
        </label>
        <button
          type="button"
          className={styles.cropPadBtn}
          title="스포이드로 화면에서 색 추출"
          onClick={onEyedropper}
        >
          스포이드
        </button>
        <button
          type="button"
          className={styles.cropPadBtn}
          disabled={samplingPad}
          title="표지 가장자리 샘플로 다시 잡기"
          onClick={onAutoPad}
        >
          {samplingPad ? '…' : '자동'}
        </button>
      </div>
    </div>
  )
}
