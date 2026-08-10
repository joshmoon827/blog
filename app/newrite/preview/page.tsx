'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { categoryLabel } from '@/data/categories'
import {
  formatBodyClassName,
  resolveArticleFormat,
} from '@/data/articleFormats'
import { parseTagsInput } from '@/lib/parseFrontmatter'
import { readNewritePreview, type NewritePreviewPayload } from '@/lib/newritePreview'
import { renderArticleBody } from '@/lib/renderArticleBody'
import TistoryPreviewBody from '@/components/TistoryPreviewBody'
import styles from '../newrite.module.css'

export default function NewritePreviewPage() {
  const [payload, setPayload] = useState<NewritePreviewPayload | null | undefined>(
    undefined,
  )

  useEffect(() => {
    setPayload(readNewritePreview())
  }, [])

  if (payload === undefined) {
    return (
      <div className={styles.fullPreviewPage}>
        <p className={styles.fullPreviewEmpty}>불러오는 중…</p>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className={styles.fullPreviewPage}>
        <header className={styles.fullPreviewChrome}>
          <h1 className={styles.fullPreviewChromeTitle}>미리보기</h1>
          <Link href="/newrite" className={styles.fullPreviewBack}>
            글쓰기로
          </Link>
        </header>
        <p className={styles.fullPreviewEmpty}>
          미리보기 데이터가 없습니다. 글쓰기에서 「크게 보기」를 다시 눌러 주세요.
        </p>
      </div>
    )
  }

  const tags = parseTagsInput(payload.tagsText)
  const format = resolveArticleFormat(payload.format)
  const empty = <p className={styles.previewEmpty}>본문이 비어 있습니다.</p>

  return (
    <div className={styles.fullPreviewPage}>
      <header className={styles.fullPreviewChrome}>
        <h1 className={styles.fullPreviewChromeTitle}>미리보기</h1>
        <Link href="/newrite" className={styles.fullPreviewBack}>
          글쓰기로
        </Link>
      </header>
      <article className={styles.fullPreviewArticle}>
        {payload.category ? (
          <p className={styles.previewMeta}>{categoryLabel(payload.category)}</p>
        ) : null}
        <h1 className={styles.previewArticleTitle}>
          {payload.title.trim() || '제목 없음'}
        </h1>
        {tags.length > 0 ? (
          <p className={styles.previewTags}>
            {tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </p>
        ) : null}
        {format === 'tistory' ? (
          <TistoryPreviewBody
            html={payload.body}
            className={styles.previewContent}
            emptyFallback={empty}
          />
        ) : (
          <div
            className={`article-body ${styles.previewContent} ${formatBodyClassName(format)}`}
            data-format={format}
          >
            {payload.body.trim()
              ? renderArticleBody(payload.body, { format })
              : empty}
          </div>
        )}
      </article>
    </div>
  )
}
