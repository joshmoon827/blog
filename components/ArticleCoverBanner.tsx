'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { coverToneFromCssColor, probeCoverBorder, type CoverTone } from '@/lib/coverBorderColor'
import { isSquareishCoverRatio, probeCoverPad } from '@/lib/coverPad'
import {
  bindCoverOverlapListeners,
  coverOverlapsHeader,
  HEADER_OVERLAP_PX,
  useCoverHeaderOverlayReport,
} from '@/components/CoverHeaderOverlay'
import styles from './ArticleCoverBanner.module.css'

type Props = {
  src: string
  alt: string
  priority?: boolean
  /** Fill a parent frame (category hero) instead of the article 16/7 strip. */
  fillParent?: boolean
  /** Sit under the site header; probe watermark padColor for header contrast. */
  headerOverlay?: boolean
}

const MOBILE_MQ = '(max-width: 640px)'

function overlayDisplayAspect(fillParent: boolean, mobile: boolean): number {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200
  const baseH = fillParent
    ? w * (mobile ? 2.1 / 4 : 4.9 / 16)
    : w * (mobile ? 3.9 / 4 : 9.1 / 16)
  return w / baseH
}

export default function ArticleCoverBanner({
  src,
  alt,
  priority,
  fillParent = false,
  headerOverlay = false,
}: Props) {
  const [padColor, setPadColor] = useState<string | null>(null)
  const [matteColor, setMatteColor] = useState<string | null>(null)
  const [padded, setPadded] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)
  const report = useCoverHeaderOverlayReport()
  const toneRef = useRef<CoverTone | null>(null)
  const matteRef = useRef<string | null>(null)

  useEffect(() => {
    if (fillParent) {
      setPadColor(null)
      setPadded(false)
      return
    }

    let cancelled = false
    setPadColor(null)

    const applyRatio = (w: number, h: number) => {
      if (!w || !h || cancelled) return
      setPadded(isSquareishCoverRatio(w / h))
    }

    const fromDom = () => {
      const img = bannerRef.current?.querySelector('img')
      if (!img?.naturalWidth || !img.naturalHeight) return false
      applyRatio(img.naturalWidth, img.naturalHeight)
      return true
    }

    fromDom()
    const img = bannerRef.current?.querySelector('img')
    const onReady = () => {
      fromDom()
    }
    img?.addEventListener('load', onReady)

    ;(async () => {
      const probe = await probeCoverPad(src)
      if (cancelled || !probe) return
      const squareish = isSquareishCoverRatio(probe.ratio)
      setPadded(squareish)
      setPadColor(squareish ? probe.color : null)
    })()

    return () => {
      cancelled = true
      img?.removeEventListener('load', onReady)
    }
  }, [src, fillParent])

  useEffect(() => {
    if (!headerOverlay) return
    let cancelled = false
    const mq = window.matchMedia(MOBILE_MQ)
    const run = async () => {
      const probe = await probeCoverBorder(src, {
        displayAspect: overlayDisplayAspect(fillParent, mq.matches),
      })
      if (cancelled) return
      const color = probe?.padColor || probe?.dominant || probe?.average || null
      toneRef.current = coverToneFromCssColor(color)
      matteRef.current = color
      setMatteColor(color)
      const el = bannerRef.current
      report({
        overlapping: el ? coverOverlapsHeader(el.getBoundingClientRect()) : true,
        tone: toneRef.current,
        padColor: color,
      })
    }
    void run()
    mq.addEventListener('change', run)
    return () => {
      cancelled = true
      mq.removeEventListener('change', run)
    }
  }, [src, headerOverlay, fillParent, report])

  useEffect(() => {
    if (!headerOverlay) return
    const el = bannerRef.current
    report({
      overlapping: true,
      tone: toneRef.current,
      padColor: matteRef.current,
    })
    if (!el) {
      return () => report({ overlapping: false, tone: null, padColor: null })
    }

    const sync = () => {
      const rect = el.getBoundingClientRect()
      const overlapping =
        rect.width === 0 && rect.height === 0
          ? true
          : coverOverlapsHeader(rect, HEADER_OVERLAP_PX)
      el.toggleAttribute('data-cover-under-header', overlapping)
      report({
        overlapping,
        tone: toneRef.current,
        padColor: matteRef.current,
      })
    }
    sync()
    const unbind = bindCoverOverlapListeners(el, sync)
    return () => {
      unbind()
      report({ overlapping: false, tone: null, padColor: null })
    }
  }, [headerOverlay, report, src])

  const fillColor = matteColor || padColor

  return (
    <div
      ref={bannerRef}
      className={`${styles.banner} ${padded ? styles.bannerPadded : ''} ${fillParent ? styles.bannerFlush : ''} ${headerOverlay && !fillParent ? styles.bannerUnderHeader : ''}`}
      data-cover-under-header={headerOverlay && !fillParent ? '' : undefined}
      data-cover-padded={padded ? '1' : '0'}
      style={fillColor ? { backgroundColor: fillColor } : undefined}
    >
      <div className={padded ? styles.frame : styles.frameBleed}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className={padded ? styles.imgPadded : styles.imgCover}
          priority={priority}
          onLoad={(e) => {
            if (fillParent) return
            const img = e.currentTarget
            const w = img.naturalWidth
            const h = img.naturalHeight
            if (!w || !h) return
            setPadded(isSquareishCoverRatio(w / h))
          }}
        />
      </div>
    </div>
  )
}
