'use client'

import { useEffect } from 'react'
import {
  MORELESS_BTN_CLASS,
  MORELESS_DEFAULT_LESS,
  MORELESS_DEFAULT_MORE,
  MORELESS_TYPE,
} from '@/lib/moreLessBlock'

/**
 * Published/preview click handler for Tistory 접은글.
 * Mirrors userblog base.js: toggle `.open` and swap button label.
 */
export default function TistoryMoreLessHydrate() {
  useEffect(() => {
    const close = (btn: HTMLElement, wrap: HTMLElement) => {
      wrap.classList.remove('open')
      btn.textContent =
        wrap.getAttribute('data-text-more') || MORELESS_DEFAULT_MORE
    }
    const open = (btn: HTMLElement, wrap: HTMLElement) => {
      wrap.classList.add('open')
      btn.textContent =
        wrap.getAttribute('data-text-less') || MORELESS_DEFAULT_LESS
    }

    const desiredLabel = (wrap: HTMLElement) =>
      wrap.classList.contains('open')
        ? wrap.getAttribute('data-text-less') || MORELESS_DEFAULT_LESS
        : wrap.getAttribute('data-text-more') || MORELESS_DEFAULT_MORE

    const syncLabels = (root: ParentNode = document) => {
      root
        .querySelectorAll(
          `[data-ke-type="${MORELESS_TYPE}"] .${MORELESS_BTN_CLASS}`,
        )
        .forEach((node) => {
          const btn = node as HTMLElement
          const wrap = btn.closest(
            `[data-ke-type="${MORELESS_TYPE}"]`,
          ) as HTMLElement | null
          if (!wrap) return
          const next = desiredLabel(wrap)
          if (btn.textContent !== next) btn.textContent = next
        })
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      const btn = target?.closest?.(
        `.${MORELESS_BTN_CLASS}`,
      ) as HTMLElement | null
      if (!btn) return
      const wrap = btn.closest(
        `[data-ke-type="${MORELESS_TYPE}"]`,
      ) as HTMLElement | null
      if (!wrap) return
      e.preventDefault()
      if (wrap.classList.contains('open')) close(btn, wrap)
      else open(btn, wrap)
    }

    syncLabels()
    document.addEventListener('click', onClick)

    /* Only react when new moreLess nodes are inserted (e.g. preview modal). */
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        for (const node of rec.addedNodes) {
          if (node.nodeType !== 1) continue
          const el = node as HTMLElement
          if (
            el.matches?.(`[data-ke-type="${MORELESS_TYPE}"]`) ||
            el.querySelector?.(`[data-ke-type="${MORELESS_TYPE}"]`)
          ) {
            syncLabels(el)
          }
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('click', onClick)
      mo.disconnect()
    }
  }, [])

  return null
}
