
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { LabToken } from '../obsidian-body/sanitize'
import styles from '../heading-permalinks/lab.module.css'

export type PreviewArticle = {
  slug: string
  title: string
  snippet: string
}

function WikiLink({
  token,
  articles,
}: {
  token: Extract<LabToken, { type: 'wikilink' }>
  articles: PreviewArticle[]
}) {
  const label = token.alias || token.target
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)
  const article = token.slug
    ? articles.find((item) => item.slug === token.slug)
    : undefined

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    }
  }, [])

  const enter = () => {
    timer.current = window.setTimeout(() => setOpen(true), 300)
  }
  const leave = () => {
    if (timer.current != null) window.clearTimeout(timer.current)
    setOpen(false)
  }

  if (!token.slug) {
    return (
      <span
        className={styles.unresolved}
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        {label}
        <span className={styles.missing}>아직 없는 노트</span>
        {open ? (
          <span className={styles.preview} role="tooltip">
            <span className={styles.previewTitle}>{label}</span>
            아직 없는 노트
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span
      className={styles.wiki}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <Link href={`/articles/${token.slug}`}>{label}</Link>
      {open ? (
        <span className={styles.preview} role="tooltip">
          <span className={styles.previewTitle}>
            {article?.title || label}
          </span>
          {article?.snippet || ''}
        </span>
      ) : null}
    </span>
  )
}

export default function WikiHover({
  tokens,
  articles,
}: {
  tokens: LabToken[]
  articles: PreviewArticle[]
}) {
  return (
    <div className={styles.body}>
      {tokens.map((token, i) => {
        if (token.type === 'text') {
          return (
            <span key={i} className={styles.p} style={{ display: 'inline' }}>
              {token.value}
            </span>
          )
        }
        if (token.type === 'pdf') {
          return (
            <span key={i} className={styles.p} style={{ display: 'inline' }}>
              {token.alias || token.filename}
            </span>
          )
        }
        return <WikiLink key={i} token={token} articles={articles} />
      })}
    </div>
  )
}
