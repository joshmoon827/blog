'use client'

import { useLayoutEffect, type ReactNode } from 'react'
import {
  applyTheme,
  oppositeTheme,
  readStoredTheme,
} from '@/lib/theme'

const SETTLE_MS = 780

/**
 * Error pages: start on the opposite theme, then ease into the user’s saved theme.
 */
export default function ErrorThemeReveal({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const target = readStoredTheme()
    const from = oppositeTheme(target)

    root.dataset.errorTheme = 'from'
    applyTheme(from)

    let settleTimer = 0
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.dataset.errorTheme = 'to'
        applyTheme(target)
        settleTimer = window.setTimeout(() => {
          delete root.dataset.errorTheme
        }, SETTLE_MS)
      })
    })

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      applyTheme(target)
      delete root.dataset.errorTheme
    }
  }, [])

  return <>{children}</>
}
