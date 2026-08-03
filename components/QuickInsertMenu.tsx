'use client'

import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

import {
  filterQuickInsertItems,
  type QuickInsertItem,
} from '@/lib/muya/quickInsertItems'
import styles from './QuickInsertMenu.module.css'

export type QuickInsertMenuProps = {
  open: boolean
  filter: string
  position: { top: number; left: number } | null
  selectedIndex: number
  onSelect: (item: QuickInsertItem) => void
  onSelectedIndexChange: (index: number) => void
}

function flattenItems(
  categories: ReturnType<typeof filterQuickInsertItems>,
): QuickInsertItem[] {
  return categories.flatMap((cat) => cat.items)
}

export function QuickInsertMenu({
  open,
  filter,
  position,
  selectedIndex,
  onSelect,
  onSelectedIndexChange,
}: QuickInsertMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const categories = useMemo(() => filterQuickInsertItems(filter), [filter])
  const flatItems = useMemo(() => flattenItems(categories), [categories])

  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [open, selectedIndex])

  useEffect(() => {
    if (!open) return
    if (flatItems.length === 0) {
      onSelectedIndexChange(0)
      return
    }
    if (selectedIndex >= flatItems.length) {
      onSelectedIndexChange(flatItems.length - 1)
    }
  }, [flatItems.length, onSelectedIndexChange, open, selectedIndex])

  if (!open || !position || typeof document === 'undefined') return null

  let runningIndex = 0

  return createPortal(
    <div
      className={styles.popover}
      style={{ top: position.top, left: position.left }}
      role="listbox"
      aria-label="블록 삽입"
      data-blog-quick-insert="true"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className={styles.header}>
        <span className={styles.headerTitle}>블록 삽입</span>
        {filter ? (
          <span className={styles.headerFilter}>/{filter}</span>
        ) : (
          <span className={styles.headerHint}>⌘/</span>
        )}
      </div>
      <div ref={listRef} className={styles.list}>
        {flatItems.length === 0 ? (
          <p className={styles.empty}>결과 없음</p>
        ) : (
          categories.map((cat) => (
            <section key={cat.name} className={styles.section}>
              <h3 className={styles.sectionTitle}>{cat.name}</h3>
              {cat.items.map((item) => {
                const index = runningIndex++
                const active = index === selectedIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-active={active ? 'true' : undefined}
                    className={`${styles.item} ${active ? styles.itemActive : ''}`}
                    onMouseEnter={() => onSelectedIndexChange(index)}
                    onClick={() => onSelect(item)}
                  >
                    <span className={styles.itemIcon} aria-hidden>
                      {item.label}
                    </span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemSubtitle}>{item.subtitle}</span>
                    </span>
                  </button>
                )
              })}
            </section>
          ))
        )}
      </div>
    </div>,
    document.body,
  )
}

export { flattenItems }
