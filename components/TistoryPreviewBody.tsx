'use client'

import type { ReactNode } from 'react'
import { renderArticleBody } from '@/lib/renderArticleBody'
import TistoryMoreLessHydrate from '@/components/TistoryMoreLessHydrate'
import styles from './TistoryPreviewBody.module.css'

type Props = {
  html: string
  className?: string
  emptyFallback?: ReactNode
  /**
   * Mount click handler for 접은글. Set false when a parent already
   * renders `TistoryMoreLessHydrate` (e.g. NewriteEditor shell).
   */
  hydrate?: boolean
  /** Light paper card — needed on dark site chrome (article + full preview). */
  paper?: boolean
}

/**
 * Shared Tistory read/preview body — same sanitize + globals skin as
 * `/newrite/preview` (emoticon align, place, moreLess, HR styles, …).
 */
export default function TistoryPreviewBody({
  html,
  className,
  emptyFallback,
  hydrate = true,
  paper = true,
}: Props) {
  const trimmed = html.trim()

  return (
    <>
      {hydrate ? <TistoryMoreLessHydrate /> : null}
      <div
        className={[
          'article-body',
          'article-format-tistory',
          paper ? styles.paper : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-format="tistory"
      >
        {trimmed
          ? renderArticleBody(html, { format: 'tistory' })
          : (emptyFallback ?? null)}
      </div>
    </>
  )
}
