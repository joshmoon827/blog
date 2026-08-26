import type { Metadata } from 'next'
import Link from 'next/link'
import { readOne } from '@/lib/localArticles'
import HeadingBody from '../heading-permalinks/HeadingBody'
import { extractHeadings } from '../heading-permalinks/headings'
import TocNav from './TocNav'
import styles from '../heading-permalinks/lab.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'TOC lab | test-ui',
  robots: { index: false, follow: false },
}

const SLUG = 'v8'

export default function TocLabPage() {
  const article = readOne(SLUG)
  if (!article) return <p>missing fixture {SLUG}</p>
  const headings = extractHeadings(article.body)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · toc</p>
        <h1 className={styles.pageTitle}>On this page</h1>
        <p className={styles.lede}>
          제목 3개 이상일 때만 보인다. 데스크탑은 오른쪽, 모바일은 서랍.
          IntersectionObserver로 현재 제목을 표시하고, 앵커는 heading-permalinks와
          같다.
        </p>
        <p className={styles.meta}>
          <Link href="/test-ui/heading-permalinks">permalinks</Link>
          {' · '}
          <Link href={`/articles/${SLUG}`}>/articles/{SLUG}</Link>
        </p>
      </header>
      <div className={styles.layout}>
        <HeadingBody markdown={article.body} articleSlug={SLUG} />
        <TocNav headings={headings} articleSlug={SLUG} />
      </div>
    </div>
  )
}
