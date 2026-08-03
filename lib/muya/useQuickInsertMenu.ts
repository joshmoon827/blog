'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Muya } from '@muyajs/core'

import { applyQuickInsert } from '@/lib/muya/applyQuickInsert'
import {
  filterQuickInsertItems,
  type QuickInsertItem,
} from '@/lib/muya/quickInsertItems'
import {
  clearSlashTrigger,
  getCaretClientRect,
  getQuickInsertFilter,
  isMuyaEditorFocused,
  isQuickInsertShortcut,
  QUICK_INSERT_TEXT_RE,
} from '@/lib/muya/quickInsertUtils'

export type QuickInsertMenuState = {
  open: boolean
  filter: string
  position: { top: number; left: number } | null
  selectedIndex: number
  onSelect: (item: QuickInsertItem) => void
  onSelectedIndexChange: (index: number) => void
}

type UseQuickInsertMenuOptions = {
  muyaRef: RefObject<Muya | null>
  hostRef: RefObject<HTMLElement | null>
  ready: boolean
  disabled: boolean
  onMarkdownChange: (md: string) => void
}

function flattenFilteredItems(filter: string): QuickInsertItem[] {
  return filterQuickInsertItems(filter).flatMap((cat) => cat.items)
}

function anchorPosition(rect: DOMRect): { top: number; left: number } {
  const menuWidth = 280
  const menuHeight = 320
  const margin = 8
  // Prefer a caret-sized anchor; huge editor rects would shove the menu off-screen.
  const anchorBottom =
    rect.height > 120
      ? Math.min(rect.top + 24, window.innerHeight - menuHeight - margin)
      : rect.bottom
  const anchorLeft = rect.left

  let top = anchorBottom + margin
  let left = anchorLeft

  if (left + menuWidth > window.innerWidth - margin) {
    left = window.innerWidth - menuWidth - margin
  }
  if (left < margin) left = margin

  if (top + menuHeight > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - menuHeight - margin)
  }
  if (top < margin) top = margin

  return { top, left }
}

export function useQuickInsertMenu({
  muyaRef,
  hostRef,
  ready,
  disabled,
  onMarkdownChange,
}: UseQuickInsertMenuOptions) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  )
  const [selectedIndex, setSelectedIndex] = useState(0)
  const openRef = useRef(open)
  openRef.current = open

  const flatItems = useMemo(() => flattenFilteredItems(filter), [filter])

  const closeMenu = useCallback(
    (clearSlash = false) => {
      setOpen(false)
      setFilter('')
      setSelectedIndex(0)
      setPosition(null)
      const muya = muyaRef.current
      if (clearSlash && muya) clearSlashTrigger(muya)
    },
    [muyaRef],
  )

  const refreshPosition = useCallback(() => {
    const muya = muyaRef.current
    if (!muya) return
    const rect = getCaretClientRect(muya)
    if (!rect) return
    setPosition(anchorPosition(rect))
  }, [muyaRef])

  const openMenu = useCallback(
    (nextFilter = '') => {
      const muya = muyaRef.current
      if (!muya || disabled) return
      const rect = getCaretClientRect(muya)
      const nextPos = rect
        ? anchorPosition(rect)
        : {
            top: Math.max(80, Math.floor(window.innerHeight * 0.2)),
            left: Math.max(16, Math.floor(window.innerWidth / 2 - 140)),
          }
      setFilter(nextFilter)
      setSelectedIndex(0)
      setPosition(nextPos)
      setOpen(true)
    },
    [disabled, muyaRef],
  )

  const insertItem = useCallback(
    (item: QuickInsertItem) => {
      const muya = muyaRef.current
      if (!muya) return
      const md = applyQuickInsert(muya, item.id)
      if (md != null) {
        onMarkdownChange(md)
      }
      closeMenu(false)
      muya.focus()
    },
    [closeMenu, muyaRef, onMarkdownChange],
  )

  const syncFromParagraph = useCallback(() => {
    const muya = muyaRef.current
    if (!muya || disabled) return
    const nextFilter = getQuickInsertFilter(muya)
    if (nextFilter == null) {
      if (openRef.current) closeMenu(false)
      return
    }
    setFilter(nextFilter)
    if (!openRef.current) {
      setOpen(true)
      setSelectedIndex(0)
      refreshPosition()
    }
  }, [closeMenu, disabled, muyaRef, refreshPosition])

  useEffect(() => {
    const muya = muyaRef.current
    if (!muya || !ready || disabled) return

    const onJsonChange = () => syncFromParagraph()
    muya.on('json-change', onJsonChange)
    return () => muya.off('json-change', onJsonChange)
  }, [disabled, muyaRef, ready, syncFromParagraph])

  useEffect(() => {
    if (!ready || disabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const muya = muyaRef.current
      if (!muya || !isMuyaEditorFocused(muya, hostRef.current)) return

      if (isQuickInsertShortcut(event)) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        if (openRef.current) {
          closeMenu(true)
        } else {
          const slashFilter = getQuickInsertFilter(muya)
          openMenu(slashFilter ?? '')
        }
        return
      }

      if (!openRef.current) return

      const slashMode = getQuickInsertFilter(muya) != null

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeMenu(slashMode)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((i) =>
          flatItems.length ? (i + 1) % flatItems.length : 0,
        )
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((i) =>
          flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0,
        )
        return
      }

      if (event.key === 'Enter') {
        const item = flatItems[selectedIndex]
        if (!item) return
        event.preventDefault()
        event.stopPropagation()
        insertItem(item)
        return
      }

      if (!slashMode) {
        if (event.key === 'Backspace') {
          event.preventDefault()
          event.stopPropagation()
          setFilter((value) => value.slice(0, -1))
          setSelectedIndex(0)
          return
        }

        if (
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault()
          event.stopPropagation()
          setFilter((value) => value + event.key)
          setSelectedIndex(0)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    closeMenu,
    disabled,
    flatItems,
    hostRef,
    insertItem,
    muyaRef,
    openMenu,
    ready,
    selectedIndex,
  ])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => refreshPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, refreshPosition])

  const menuProps: QuickInsertMenuState = {
    open,
    filter,
    position,
    selectedIndex,
    onSelect: insertItem,
    onSelectedIndexChange: setSelectedIndex,
  }

  return { menuProps, closeMenu }
}

export { QUICK_INSERT_TEXT_RE }
