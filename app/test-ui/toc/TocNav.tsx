
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Heading } from '../heading-permalinks/headings'
import styles from '../heading-permalinks/lab.module.css'

export default function TocNav({
  headings,
  articleSlug,
}: {
  headings: Heading[]
  articleSlug: string
}) {
  const items = useMemo(
    () => headings.filter((h) => h.level >= 2),
    [headings],
  )
  const [active, setActive] = useState(items[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const ids = items.map((h) => h.id).join('|')

  useEffect(() => {
    const list = ids ? ids.split('|') : []
    if (list.length < 3 || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const id = visible[0]?.target.id
        if (id) setActive(id)
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: [0, 0.1, 0.5, 1] },
    )
    for (const id of list) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  if (items.length < 3) {
    return (
      <p className={styles.hiddenNote}>제목이 3개 미만이라 On this page를 숨긴다.</p>
    )
  }

  const list = (
    <nav className={styles.toc} aria-label="On this page">
      <p className={styles.tocTitle}>On this page</p>
      <ul className={styles.tocList}>
        {items.map((heading) => (
          <li key={heading.id}>
            <a
              href={`/articles/${articleSlug}#${heading.id}`}
              className={`${heading.level >= 3 ? styles.tocL3 : ''} ${
                heading.id === active ? styles.tocActive : ''
              }`.trim()}
              onClick={() => setOpen(false)}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <>
      <button
        type="button"
        className={styles.drawerBtn}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        On this page
      </button>
      <div className={styles.drawer} data-open={open ? 'true' : 'false'}>
        {list}
      </div>
      <aside>{list}</aside>
    </>
  )
}
