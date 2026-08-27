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
  /** Optional cover image — same padColor probe as ArticleCoverBanner. */
  probeSrc?: string | null
  fallbackTone?: CoverTone
  /** Last resort when the stage has no opaque pixels (pretext). */
  matchHtmlTheme?: boolean
}

const MOBILE_MQ = '(max-width: 640px)'

function htmlThemeTone(): CoverTone {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function displayAspect(el: HTMLElement | null): number | undefined {
  if (!el || el.clientHeight <= 0) return undefined
  return el.clientWidth / el.clientHeight
}

async function toneFromCoverProbe(
  src: string,
  el: HTMLElement | null,
): Promise<CoverTone | null> {
  const probe = await probeCoverBorder(src, {
    displayAspect: displayAspect(el),
  })
  const color = probe?.padColor || probe?.dominant || probe?.average || null
  return coverToneFromCssColor(color)
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
    const mq = window.matchMedia(MOBILE_MQ)

    const syncTone = async () => {
      if (cancelled || !el) return

      if (probeSrc) {
        const fromProbe = await toneFromCoverProbe(probeSrc, el)
        if (cancelled) return
        if (fromProbe) {
          setTone(fromProbe)
          return
        }
      }

      const fromDom = coverToneFromElementTop(el, HEADER_OVERLAP_PX)
      if (fromDom) {
        setTone(fromDom)
        return
      }

      if (matchHtmlTheme) {
        setTone(htmlThemeTone())
        return
      }
      setTone(fallbackTone)
    }

    void syncTone()

    const imgs = el ? [...el.querySelectorAll('img')] : []
    const onReady = () => {
      if (!cancelled) void syncTone()
    }
    for (const img of imgs) {
      if (!img.complete) img.addEventListener('load', onReady)
    }

    const ro = el ? new ResizeObserver(() => void syncTone()) : null
    if (el) ro?.observe(el)

    const onMqChange = () => void syncTone()
    mq.addEventListener('change', onMqChange)

    let themeMo: MutationObserver | null = null
    if (matchHtmlTheme) {
      themeMo = new MutationObserver(() => {
        if (!cancelled) void syncTone()
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
      mq.removeEventListener('change', onMqChange)
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
