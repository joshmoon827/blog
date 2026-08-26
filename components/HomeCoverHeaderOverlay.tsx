'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HEADER_OVERLAP_PX, useBindCoverHeaderOverlay } from '@/components/CoverHeaderOverlay'
import {
  coverToneFromCssColor,
  coverToneFromElementTop,
  probeCoverBorder,
  type CoverTone,
} from '@/lib/coverBorderColor'

type Props = {
  children: ReactNode
  className?: string
  /** Optional photo URL if the painted stage cannot be sampled (CORS / empty). */
  probeSrc?: string | null
  fallbackTone?: CoverTone
  /** Last resort when the stage has no opaque pixels (pretext). */
  matchHtmlTheme?: boolean
}

function htmlThemeTone(): CoverTone {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export default function HomeCoverHeaderOverlay({
  children,
  className,
  probeSrc,
  fallbackTone = 'dark',
  matchHtmlTheme = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [tone, setTone] = useState<CoverTone>(fallbackTone)

  useEffect(() => {
    let cancelled = false
    const el = ref.current

    const applyDom = (): boolean => {
      if (!el || cancelled) return false
      const next = coverToneFromElementTop(el, HEADER_OVERLAP_PX)
      if (!next) return false
      setTone(next)
      return true
    }

    const run = async () => {
      if (applyDom()) return
      if (probeSrc) {
        const aspect =
          el && el.clientHeight > 0 ? el.clientWidth / el.clientHeight : undefined
        const probe = await probeCoverBorder(probeSrc, {
          displayAspect: aspect,
        })
        if (cancelled) return
        if (applyDom()) return
        // Top of the crop — not watermark padColor (often a dark corner on a light mosaic).
        const color = probe?.topColor || probe?.average || probe?.dominant
        setTone(coverToneFromCssColor(color) ?? fallbackTone)
        return
      }
      if (matchHtmlTheme) {
        setTone(htmlThemeTone())
        return
      }
      setTone(fallbackTone)
    }

    void run()

    const imgs = el ? [...el.querySelectorAll('img')] : []
    const onReady = () => {
      if (!cancelled) applyDom()
    }
    for (const img of imgs) {
      if (!img.complete) img.addEventListener('load', onReady)
    }
    const ro = el ? new ResizeObserver(() => applyDom()) : null
    if (el) ro?.observe(el)

    let themeMo: MutationObserver | null = null
    if (matchHtmlTheme) {
      themeMo = new MutationObserver(() => {
        if (!cancelled && !applyDom()) setTone(htmlThemeTone())
      })
      themeMo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })
    }

    return () => {
      cancelled = true
      for (const img of imgs) img.removeEventListener('load', onReady)
      ro?.disconnect()
      themeMo?.disconnect()
    }
  }, [fallbackTone, matchHtmlTheme, probeSrc])

  useBindCoverHeaderOverlay(ref, true, { tone, padColor: null })

  return (
    <div ref={ref} className={className} data-cover-under-header="">
      {children}
    </div>
  )
}
