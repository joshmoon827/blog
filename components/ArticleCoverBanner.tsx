'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './ArticleCoverBanner.module.css'

type Props = {
  src: string
  alt: string
  priority?: boolean
}

/** Treat as square-ish when width/height is below this (banner is ~2.29). */
const SQUAREISH_MAX_RATIO = 1.55

/** Inset from each edge before walking the border ring. */
const EDGE_INSET_PX = 10

/** Sample every N px along the ring so we don't read every single pixel. */
const RING_STEP_PX = 4

type ImageProbe = {
  ratio: number
  color: string | null
}

function averageBorderRingColor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): string | null {
  const inset = Math.min(
    EDGE_INSET_PX,
    Math.floor((w - 1) / 2),
    Math.floor((h - 1) / 2),
  )
  const left = inset
  const top = inset
  const right = w - 1 - inset
  const bottom = h - 1 - inset
  if (right <= left || bottom <= top) return null

  const { data } = ctx.getImageData(0, 0, w, h)
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let count = 0

  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4
    const a = data[i + 3]
    if (a === 0) return
    sumR += data[i]
    sumG += data[i + 1]
    sumB += data[i + 2]
    count += 1
  }

  // Walk the inset rectangle clockwise: top → right → bottom → left.
  for (let x = left; x <= right; x += RING_STEP_PX) take(x, top)
  for (let y = top + RING_STEP_PX; y <= bottom; y += RING_STEP_PX) take(right, y)
  for (let x = right - RING_STEP_PX; x >= left; x -= RING_STEP_PX) take(x, bottom)
  for (let y = bottom - RING_STEP_PX; y > top; y -= RING_STEP_PX) take(left, y)

  if (!count) return null
  return `rgb(${Math.round(sumR / count)}, ${Math.round(sumG / count)}, ${Math.round(sumB / count)})`
}

function probeCoverImage(src: string): Promise<ImageProbe | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.decoding = 'async'
    img.onload = () => {
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) {
          resolve(null)
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        resolve({
          ratio: w / h,
          color: averageBorderRingColor(ctx, w, h),
        })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export default function ArticleCoverBanner({ src, alt, priority }: Props) {
  const [padColor, setPadColor] = useState<string | null>(null)
  const [padded, setPadded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPadColor(null)
    setPadded(false)

    ;(async () => {
      const probe = await probeCoverImage(src)
      if (cancelled || !probe) return
      const isSquareish = probe.ratio <= SQUAREISH_MAX_RATIO
      setPadded(isSquareish)
      setPadColor(isSquareish ? probe.color : null)
    })()

    return () => {
      cancelled = true
    }
  }, [src])

  return (
    <div
      className={`${styles.banner} ${padded ? styles.bannerPadded : ''}`}
      style={padColor ? { backgroundColor: padColor } : undefined}
    >
      <div className={padded ? styles.frame : styles.frameBleed}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className={padded ? styles.imgPadded : styles.imgCover}
          priority={priority}
        />
      </div>
    </div>
  )
}
