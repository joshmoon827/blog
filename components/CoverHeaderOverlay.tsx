'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type RefObject,
  type ReactNode,
} from 'react'
import type { CoverTone } from '@/lib/coverBorderColor'

export const HEADER_OVERLAP_PX = 64

type OverlayState = {
  overlapping: boolean
  tone: CoverTone | null
  padColor: string | null
}

const idle: OverlayState = { overlapping: false, tone: null, padColor: null }

const CoverHeaderStateContext = createContext<OverlayState>(idle)
const CoverHeaderReportContext = createContext<(next: OverlayState) => void>(() => {})

export function CoverHeaderOverlayProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OverlayState>(idle)
  const report = useCallback((next: OverlayState) => {
    setState((prev) =>
      prev.overlapping === next.overlapping &&
      prev.tone === next.tone &&
      prev.padColor === next.padColor
        ? prev
        : next,
    )
  }, [])
  return (
    <CoverHeaderReportContext.Provider value={report}>
      <CoverHeaderStateContext.Provider value={state}>{children}</CoverHeaderStateContext.Provider>
    </CoverHeaderReportContext.Provider>
  )
}

export function useCoverHeaderOverlayState() {
  return useContext(CoverHeaderStateContext)
}

export function useCoverHeaderOverlayReport() {
  return useContext(CoverHeaderReportContext)
}

/** True while any of the cover sits in the sticky header band [0, headerPx]. */
export function coverOverlapsHeader(rect: DOMRect, headerPx = HEADER_OVERLAP_PX): boolean {
  if (rect.width === 0 && rect.height === 0) return false
  return rect.top < headerPx && rect.bottom > 0
}

/** body overflow-x:hidden makes body the scroller — window 'scroll' may not fire. */
export function bindCoverOverlapListeners(el: HTMLElement, sync: () => void): () => void {
  const opts = { passive: true } as const
  window.addEventListener('scroll', sync, opts)
  window.addEventListener('resize', sync)
  document.body.addEventListener('scroll', sync, opts)
  const se = document.scrollingElement
  if (se && se !== document.body) se.addEventListener('scroll', sync, opts)
  const io =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(sync, { root: null, threshold: [0, 0.01, 1] })
  io?.observe(el)
  return () => {
    window.removeEventListener('scroll', sync)
    window.removeEventListener('resize', sync)
    document.body.removeEventListener('scroll', sync)
    if (se && se !== document.body) se.removeEventListener('scroll', sync)
    io?.disconnect()
  }
}

/** Observe a cover element and drive the sticky header overlay until unmount. */
export function useBindCoverHeaderOverlay(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  sample: { tone: CoverTone | null; padColor: string | null },
) {
  const report = useCoverHeaderOverlayReport()
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    const sync = () => {
      const overlapping = coverOverlapsHeader(el.getBoundingClientRect(), HEADER_OVERLAP_PX)
      el.toggleAttribute('data-cover-under-header', overlapping)
      report({
        overlapping,
        tone: sample.tone,
        padColor: sample.padColor,
      })
    }
    sync()
    const unbind = bindCoverOverlapListeners(el, sync)
    return () => {
      unbind()
      report({ overlapping: false, tone: null, padColor: null })
    }
  }, [enabled, ref, report, sample.padColor, sample.tone])
}
