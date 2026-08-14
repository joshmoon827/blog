'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  mosaicCoverBitmapSize,
  mosaicPieceRotation,
  mosaicPieceScale,
  type MosaicObjectFit,
  type MosaicPiece,
} from '@/lib/mosaicPattern'

type Props = {
  src: string
  alt?: string
  piece: Pick<
    MosaicPiece,
    'objectFit' | 'objectPosition' | 'imageScale' | 'imageRotation'
  >
  className?: string
  /** Dim the bitmap (crop ghost). */
  dimmed?: boolean
  /** Hover zoom for published cards — ignored when dimmed. */
  hoverScale?: number
  sizes?: string
  draggable?: boolean
}

function parseObjectPosition(raw: string | undefined): { x: number; y: number } {
  const t = (raw ?? 'center').trim().toLowerCase() || 'center'
  const token = (s: string, axis: 'x' | 'y'): number | null => {
    if (s === 'center' || s === 'centre') return 50
    if (s === 'left') return axis === 'x' ? 0 : null
    if (s === 'right') return axis === 'x' ? 100 : null
    if (s === 'top') return axis === 'y' ? 0 : null
    if (s === 'bottom') return axis === 'y' ? 100 : null
    const m = s.match(/^(-?\d+(?:\.\d+)?)%?$/)
    if (!m) return null
    return Math.min(100, Math.max(0, Number(m[1])))
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const x = token(parts[0]!, 'x')
    const y = token(parts[0]!, 'y')
    if (x != null && y == null) return { x, y: 50 }
    if (y != null && x == null) return { x: 50, y }
    if (x != null && y != null) return { x, y }
    return { x: 50, y: 50 }
  }
  return {
    x: token(parts[0]!, 'x') ?? 50,
    y: token(parts[1]!, 'y') ?? 50,
  }
}

/**
 * Full original bitmap as a natural-aspect rectangle.
 * Scale changes the rectangle size — pad stays outside the photo, never inset into it.
 */
export default function MosaicBitmapImage({
  src,
  alt = '',
  piece,
  className,
  dimmed,
  hoverScale = 1,
  draggable = false,
}: Props) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const [natural, setNatural] = useState({ w: 1600, h: 1000 })
  const [framePx, setFramePx] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNatural({ w: img.naturalWidth, h: img.naturalHeight })
      }
    }
    img.src = src
  }, [src])

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

  useEffect(() => {
    if (hoverScale <= 1) return
    const root = hostRef.current?.parentElement
    if (!root) return
    const enter = () => setHovered(true)
    const leave = () => setHovered(false)
    root.addEventListener('mouseenter', enter)
    root.addEventListener('mouseleave', leave)
    return () => {
      root.removeEventListener('mouseenter', enter)
      root.removeEventListener('mouseleave', leave)
    }
  }, [hoverScale])

  const scale = mosaicPieceScale(piece)
  const rotation = mosaicPieceRotation(piece)
  const pos = parseObjectPosition(piece.objectPosition)
  const fit: MosaicObjectFit =
    piece.objectFit === 'contain' ? 'contain' : 'cover'
  const visualScale =
    !dimmed && hovered && hoverScale > 1 ? scale * hoverScale : scale
  const size = mosaicCoverBitmapSize(
    framePx.w,
    framePx.h,
    natural.w,
    natural.h,
    visualScale,
    fit,
  )
  const left = framePx.w * (pos.x / 100) - size.w * (pos.x / 100)
  const top = framePx.h * (pos.y / 100) - size.h * (pos.y / 100)

  const imgStyle: CSSProperties = {
    position: 'absolute',
    left,
    top,
    width: size.w || undefined,
    height: size.h || undefined,
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'fill',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
    pointerEvents: 'none',
    filter: dimmed ? 'brightness(0.42)' : undefined,
    willChange: 'transform, left, top, width, height',
    transition: hoverScale > 1 ? 'width 0.45s ease, height 0.45s ease, left 0.45s ease, top 0.45s ease' : undefined,
  }

  return (
    <span
      ref={hostRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'block',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={draggable} style={imgStyle} />
    </span>
  )
}

