'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { probeCoverBorder } from '@/lib/coverBorderColor'
import { useCoverMatteSettings } from '@/hooks/useCoverMatteSettings'
import styles from './ImageCarousel.module.css'

interface Props {
  /** Fixed cover image — no rotation */
  src: string
  alt: string
  aspectRatio?: string
  priority?: boolean
  /**
   * Home cards: sample border ring; pad when a clearly different color
   * appears on that ring. Tunable via /settings when logged in.
   * Pad fill = watermark bottom-right corner sample color.
   */
  edgeMatte?: boolean
}

/** Static cover image (kept name for existing imports). */
export default function ImageCarousel({
  src,
  alt,
  aspectRatio,
  priority,
  edgeMatte = false,
}: Props) {
  const { settings } = useCoverMatteSettings()
  const [matte, setMatte] = useState<string | null>(null)
  const [padded, setPadded] = useState(false)

  // Parse "W / H" → width/height for converting height-% padding to side insets.
  const ratio = useMemo(() => {
    if (!aspectRatio) return 5 / 4
    const m = aspectRatio.match(/([\d.]+)\s*\/\s*([\d.]+)/)
    if (!m) return 5 / 4
    const w = Number(m[1])
    const h = Number(m[2])
    return w > 0 && h > 0 ? w / h : 5 / 4
  }, [aspectRatio])

  const padPercent = settings.padPercent
  const colorDiffThreshold = settings.colorDiffPercent / 100
  const ringInsetRatio = settings.ringInsetPercent / 100

  useEffect(() => {
    if (!edgeMatte || !src) {
      setMatte(null)
      setPadded(false)
      return
    }
    let cancelled = false
    // Do not clear padded/matte before the probe finishes — clearing mid-flight
    // remounts next/image children and can throw removeChild on a null parent.
    ;(async () => {
      const probe = await probeCoverBorder(src, {
        displayAspect: ratio,
        ringInsetRatio,
        colorDiffThreshold,
      })
      if (cancelled) return
      if (!probe || !probe.needsPad || padPercent <= 0) {
        setMatte(null)
        setPadded(false)
        return
      }
      const color = probe.padColor || probe.dominant || probe.average
      if (!color) {
        setMatte(null)
        setPadded(false)
        return
      }
      setMatte(color)
      setPadded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [src, edgeMatte, ratio, padPercent, colorDiffThreshold, ringInsetRatio])

  const sidePct =
    padded && padPercent > 0
      ? `${(padPercent / ratio).toFixed(3)}%`
      : undefined
  const edgePct = padded && padPercent > 0 ? `${padPercent}%` : undefined

  return (
    <div
      className={`${styles.wrap} ${padded ? styles.wrapPadded : ''}`}
      style={{
        ...(aspectRatio ? { aspectRatio } : undefined),
        ...(matte ? { backgroundColor: matte } : undefined),
      }}
    >
      <div
        className={styles.slide}
        style={
          padded && edgePct
            ? {
                top: edgePct,
                bottom: edgePct,
                left: sidePct,
                right: sidePct,
              }
            : undefined
        }
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
            className={styles.img}
            style={{ objectFit: padded ? 'contain' : 'cover' }}
            priority={priority}
          />
        ) : null}
      </div>
    </div>
  )
}
