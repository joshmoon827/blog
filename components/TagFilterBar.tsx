'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Article } from '@/data/articles'
import { collectTagsFromArticles, countArticlesByTag } from '@/data/metadata'
import type { TagGlassVariantId } from '@/data/tagGlassVariants'
import styles from './TagFilterBar.module.css'

interface TagFilterBarProps {
  articles: Article[]
  selectedTag?: string
  basePath?: string
  variant?: TagGlassVariantId
}

type TagItem = {
  key: string
  label: string
  count: number
  href: string
  active: boolean
}

const tagEase = [0.22, 1, 0.36, 1] as const
const staggerStep = 0.028
const staggerDelay = 0.04

const rowsWrapperVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0, delayChildren: 0 },
  },
  exit: {
    transition: { staggerChildren: 0, delayChildren: 0 },
  },
}

const rowStaggerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: staggerStep, delayChildren: staggerDelay },
  },
  exit: {
    transition: { staggerChildren: staggerStep, staggerDirection: -1, delayChildren: 0 },
  },
}

const tagItemVariants = {
  hidden: { opacity: 0, x: -28 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.42, ease: tagEase },
  },
  exit: {
    opacity: 0,
    x: -28,
    transition: { duration: 0.34, ease: tagEase },
  },
}

function ExpandedTagRows({
  topRow,
  bottomRow,
  renderTagLink,
  motionPhase,
  onMotionComplete,
}: {
  topRow: TagItem[]
  bottomRow: TagItem[]
  renderTagLink: (item: TagItem) => React.ReactNode
  motionPhase: 'show' | 'exit'
  onMotionComplete?: (definition: string) => void
}) {
  return (
    <motion.div
      className={styles.rows}
      variants={rowsWrapperVariants}
      initial="hidden"
      animate={motionPhase}
      exit="exit"
      onAnimationComplete={onMotionComplete}
    >
      <motion.ul className={styles.row} variants={rowStaggerVariants}>
        {topRow.map((item) => (
          <motion.li key={item.key} variants={tagItemVariants} layout={false}>
            {renderTagLink(item)}
          </motion.li>
        ))}
      </motion.ul>
      <motion.ul className={styles.row} variants={rowStaggerVariants}>
        {bottomRow.map((item) => (
          <motion.li key={item.key} variants={tagItemVariants} layout={false}>
            {renderTagLink(item)}
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  )
}

function ExpandedMoreOverlay({
  showFade,
  onClick,
}: {
  showFade: boolean
  onClick: () => void
}) {
  return (
    <>
      {showFade && <div className={styles.fadeEdge} aria-hidden="true" />}
      <button type="button" className={styles.morePill} aria-expanded aria-label="태그 접기" onClick={onClick}>
        …
      </button>
    </>
  )
}

function CollapsedTagList({
  items,
  needsExpand,
  animateIn,
  renderTagLink,
  onExpand,
  onAnimateComplete,
}: {
  items: TagItem[]
  needsExpand: boolean
  animateIn: boolean
  renderTagLink: (item: TagItem) => React.ReactNode
  onExpand: () => void
  onAnimateComplete: () => void
}) {
  const moreDelay = staggerDelay + items.length * staggerStep

  return (
    <motion.ul
      className={styles.collapsedList}
      variants={rowStaggerVariants}
      initial={animateIn ? 'hidden' : 'show'}
      animate="show"
      onAnimationComplete={(definition) => {
        if (animateIn && definition === 'show') onAnimateComplete()
      }}
    >
      {items.map((item) => (
        <motion.li key={item.key} variants={tagItemVariants} layout={false}>
          {renderTagLink(item)}
        </motion.li>
      ))}
      {needsExpand && (
        <motion.li
          key="__more__"
          className={styles.moreItem}
          variants={tagItemVariants}
          layout={false}
          initial={animateIn ? 'hidden' : 'show'}
          animate="show"
          transition={
            animateIn
              ? { duration: 0.42, ease: tagEase, delay: moreDelay }
              : { duration: 0.42, ease: tagEase }
          }
        >
          <button
            type="button"
            className={styles.more}
            aria-expanded={false}
            aria-label="태그 더 보기"
            onClick={onExpand}
          >
            …
          </button>
        </motion.li>
      )}
    </motion.ul>
  )
}

export default function TagFilterBar({ articles, selectedTag, basePath = '/', variant }: TagFilterBarProps) {
  const measureRef = useRef<HTMLUListElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [tagMotion, setTagMotion] = useState<'show' | 'exit'>('show')
  const [collapsedEnter, setCollapsedEnter] = useState(false)
  const [needsExpand, setNeedsExpand] = useState(true)
  const filterTags = useMemo(() => collectTagsFromArticles(articles), [articles])
  const [visibleCount, setVisibleCount] = useState(filterTags.length + 1)
  const [showScrollFade, setShowScrollFade] = useState(true)

  const buildHref = useCallback(
    (tag?: string) => {
      if (!tag) return basePath
      const separator = basePath.includes('?') ? '&' : '?'
      return `${basePath}${separator}tag=${encodeURIComponent(tag)}`
    },
    [basePath],
  )

  const items = useMemo<TagItem[]>(
    () => [
      {
        key: 'all',
        label: 'All',
        count: articles.length,
        href: buildHref(),
        active: !selectedTag,
      },
      ...filterTags.map((tag) => ({
        key: tag,
        label: tag,
        count: countArticlesByTag(tag, articles),
        href: buildHref(tag),
        active: selectedTag === tag,
      })),
    ],
    [articles, buildHref, filterTags, selectedTag],
  )

  const measureOverflow = useCallback(() => {
    const measureList = measureRef.current
    if (!measureList || expanded) return

    const children = Array.from(measureList.children) as HTMLLIElement[]
    if (children.length < 2) return

    // Last child is the "…" placeholder — keep it on row 2 beside the last tag.
    const moreEl = children[children.length - 1]
    const tagItems = children.slice(0, -1)
    if (tagItems.length === 0) return

    const maxBottom = measureList.clientHeight + 1
    const fitsTwoRows = (els: HTMLElement[]) =>
      els.every((el) => el.offsetTop + el.offsetHeight <= maxBottom)

    const resetDisplay = () => {
      for (const el of tagItems) el.style.display = ''
      moreEl.style.display = ''
    }

    resetDisplay()
    void measureList.offsetHeight
    if (fitsTwoRows([...tagItems, moreEl])) {
      setVisibleCount(tagItems.length)
      setNeedsExpand(false)
      return
    }

    let fitCount = 1
    for (let k = tagItems.length - 1; k >= 1; k--) {
      for (let i = 0; i < tagItems.length; i++) {
        tagItems[i].style.display = i < k ? '' : 'none'
      }
      moreEl.style.display = ''
      void measureList.offsetHeight
      const visible = tagItems.slice(0, k)
      if (fitsTwoRows([...visible, moreEl])) {
        fitCount = k
        break
      }
    }

    resetDisplay()
    setVisibleCount(fitCount)
    setNeedsExpand(true)
  }, [expanded, items.length])

  const updateScrollFade = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const hasOverflow = viewport.scrollWidth > viewport.clientWidth + 2
    const atEnd = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2
    setShowScrollFade(hasOverflow && !atEnd)
  }, [])

  useLayoutEffect(() => {
    measureOverflow()
  }, [measureOverflow, items])

  useLayoutEffect(() => {
    if (expanded) return

    const measureList = measureRef.current
    if (!measureList) return

    const observer = new ResizeObserver(() => measureOverflow())
    observer.observe(measureList)

    return () => observer.disconnect()
  }, [expanded, measureOverflow])

  useLayoutEffect(() => {
    if (!expanded) return

    updateScrollFade()
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new ResizeObserver(() => updateScrollFade())
    observer.observe(viewport)

    return () => observer.disconnect()
  }, [expanded, updateScrollFade, items])

  const midpoint = Math.ceil(items.length / 2)
  const topRow = items.slice(0, midpoint)
  const bottomRow = items.slice(midpoint)
  const collapsedItems = needsExpand ? items.slice(0, visibleCount) : items

  const renderTagLink = (item: TagItem) => (
    <Link
      href={item.href}
      className={`${styles.tagLink} ${item.active ? styles.tagActive : ''}`}
      aria-current={item.active ? 'true' : undefined}
      aria-label={`${item.label}, ${item.count} articles`}
    >
      <span>{item.label}</span>
      <span className={styles.tagDot} aria-hidden="true">
        ·
      </span>
      <span className={styles.tagCount}>{item.count}</span>
    </Link>
  )

  const handleExpand = () => {
    setCollapsedEnter(false)
    setTagMotion('show')
    setExpanded(true)
    setShowScrollFade(true)
  }

  const handleCollapse = () => {
    setTagMotion('exit')
  }

  const handleTagMotionComplete = (definition: string) => {
    if (definition !== 'exit') return
    setCollapsedEnter(true)
    setExpanded(false)
    setTagMotion('show')
  }

  return (
    <nav className={`${styles.wrapper} ${variant ? styles[variant] : ''}`} aria-label="Article tags">
      <div className={styles.measureShell} aria-hidden="true">
        <ul ref={measureRef} className={styles.collapsedList}>
          {items.map((item) => (
            <li key={item.key}>
              <span className={styles.tagLink}>
                <span>{item.label}</span>
                <span className={styles.tagDot}>·</span>
                <span className={styles.tagCount}>{item.count}</span>
              </span>
            </li>
          ))}
          <li className={styles.moreItem}>
            <span className={styles.more}>…</span>
          </li>
        </ul>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!expanded ? (
          <motion.div key="collapsed" className={styles.shellCollapsed}>
            <CollapsedTagList
              items={collapsedItems}
              needsExpand={needsExpand}
              animateIn={collapsedEnter}
              renderTagLink={renderTagLink}
              onExpand={handleExpand}
              onAnimateComplete={() => setCollapsedEnter(false)}
            />
          </motion.div>
        ) : (
          <motion.div key="expanded" className={styles.shellExpanded} initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}>
            <div className={styles.fadeWrap}>
              <div ref={viewportRef} className={styles.viewport} onScroll={updateScrollFade}>
                <ExpandedTagRows
                  topRow={topRow}
                  bottomRow={bottomRow}
                  renderTagLink={renderTagLink}
                  motionPhase={tagMotion}
                  onMotionComplete={handleTagMotionComplete}
                />
              </div>
              <ExpandedMoreOverlay showFade={showScrollFade} onClick={handleCollapse} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
