import type { Metadata } from 'next'
import Link from 'next/link'
import { readOne } from '@/lib/localArticles'
import HeadingBody from './HeadingBody'
import { extractHeadings } from './headings'
import styles from './lab.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'Heading permalinks lab | test-ui',
  robots: { index: false, follow: false },
}

const SLUG = 'v8'

export default function HeadingPermalinksPage() {
  const article = readOne(SLUG)
  if (!article) return <p>missing fixture {SLUG}</p>
  const headings = extractHeadings(article.body)
  const h23 = headings.filter((h) => h.level >= 2)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · heading-permalinks</p>
        <h1 className={styles.pageTitle}>Heading permalinks</h1>
        <p className={styles.lede}>
          픽스처 <Link href={`/articles/${SLUG}`}>/articles/{SLUG}</Link>. h2/h3에
          호버하면 #이 뜨고, 링크는{' '}
          <code>/articles/{SLUG}#한글-slug</code>다. 본편 ArticleView는 그대로다.
        </p>
        <p className={styles.meta}>
          h2/h3 {h23.length}개 · 전체 제목 {headings.length}개
        </p>
      </header>
      <HeadingBody markdown={article.body} articleSlug={SLUG} />
    </div>
  )
}
