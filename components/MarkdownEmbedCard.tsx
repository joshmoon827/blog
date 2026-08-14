'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { EmbedCardData } from '@/lib/obsidianEmbed'
import styles from './MarkdownEmbedCard.module.css'

type Props = {
  data: EmbedCardData
}

const MEDIA_MIN_PX = 96
const MEDIA_MAX_PX = 320

/**
 * Obsidian `aspectRatio` is height as % of width (e.g. 67.5).
 * Returns width/height for sizing the media column from text height.
 */
function widthOverHeight(aspectPct: number): number {
  if (!Number.isFinite(aspectPct) || aspectPct <= 0) return 16 / 9
  return 100 / aspectPct
}

export default function MarkdownEmbedCard({ data }: Props) {
  const title = data.title?.trim() || data.url
  const desc = data.description?.trim() || ''
  const aspectPct = Number(data.aspectRatio)
  const hasAspect = Number.isFinite(aspectPct) && aspectPct > 0

  const bodyRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [wh, setWh] = useState(() =>
    hasAspect ? widthOverHeight(aspectPct) : 16 / 9,
  )
  const [mediaW, setMediaW] = useState<number | null>(null)

  // Prefer embed metadata; fall back to natural image ratio once loaded.
  useEffect(() => {
    if (hasAspect) {
      setWh(widthOverHeight(aspectPct))
      return
    }
    const img = imgRef.current
    if (!img) return
    const apply = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setWh(img.naturalWidth / img.naturalHeight)
      }
    }
    if (img.complete) apply()
    else img.addEventListener('load', apply)
    return () => img.removeEventListener('load', apply)
  }, [aspectPct, hasAspect, data.image])

  // Media width = text-column height × (width/height), clamped.
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body || typeof ResizeObserver === 'undefined') return

    const update = () => {
      const h = body.getBoundingClientRect().height
      if (h <= 0) return
      const next = Math.round(
        Math.min(MEDIA_MAX_PX, Math.max(MEDIA_MIN_PX, h * wh)),
      )
      setMediaW((prev) => (prev === next ? prev : next))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(body)
    return () => ro.disconnect()
  }, [wh, title, desc, data.url])

  const mediaStyle = (
    mediaW != null
      ? {
          width: mediaW,
          flexBasis: mediaW,
          ['--embed-ar' as string]: `${wh}`,
        }
      : {
          ['--embed-ar' as string]: `${wh}`,
        }
  ) as CSSProperties

  return (
    <a
      className={styles.card}
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {data.image ? (
        <div className={styles.media} style={mediaStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={data.image}
            alt=""
            loading="lazy"
            className={styles.img}
          />
        </div>
      ) : (
        <div
          className={`${styles.media} ${styles.mediaEmpty}`}
          style={mediaStyle}
          aria-hidden
        />
      )}
      <div ref={bodyRef} className={styles.body}>
        <div className={styles.title}>{title}</div>
        {desc ? <p className={styles.desc}>{desc}</p> : null}
        <div className={styles.url}>{data.url}</div>
      </div>
    </a>
  )
}
