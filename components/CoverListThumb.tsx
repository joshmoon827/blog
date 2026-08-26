'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  isSquareishCoverRatio,
  probeCoverPad,
} from '@/lib/coverPad'
import styles from './CoverListThumb.module.css'

type Props = {
  src: string
  alt?: string
  sizes: string
  className?: string
}

export default function CoverListThumb({
  src,
  alt = '',
  sizes,
  className,
}: Props) {
  const [padded, setPadded] = useState(false)
  const [padColor, setPadColor] = useState<string | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setPadColor(null)

    const applyRatio = (w: number, h: number) => {
      if (!w || !h || cancelled) return
      setPadded(isSquareishCoverRatio(w / h))
    }

    const fromDom = () => {
      const img = frameRef.current?.querySelector('img')
      if (!img?.naturalWidth || !img.naturalHeight) return false
      applyRatio(img.naturalWidth, img.naturalHeight)
      return true
    }

    fromDom()
    const img = frameRef.current?.querySelector('img')
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
  }, [src])

  return (
    <div
      ref={frameRef}
      className={`${styles.frame}${className ? ` ${className}` : ''}`}
      data-cover-padded={padded ? '1' : '0'}
      style={padColor ? { backgroundColor: padColor } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={padded ? styles.imgPadded : styles.imgCover}
        onLoad={(e) => {
          const img = e.currentTarget
          const w = img.naturalWidth
          const h = img.naturalHeight
          if (!w || !h) return
          setPadded(isSquareishCoverRatio(w / h))
        }}
      />
    </div>
  )
}
