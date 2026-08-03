import ArticleCard from '@/components/ArticleCard'
import Link from 'next/link'
import { getDraftArticles } from '@/lib/listedArticles'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '임시저장 | Laws of UX',
}

export default function DraftsPage() {
  const drafts = getDraftArticles()

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Link href="/newrite">← 글쓰기</Link>
        </p>
        <h1 className={styles.title}>임시저장</h1>
        <p className={styles.sub}>
          {drafts.length === 0
            ? '저장된 임시글이 없습니다.'
            : `${drafts.length}개의 임시저장 글`}
        </p>
      </section>
      <section className={styles.grid} aria-label="임시저장 글">
        {drafts.map((article, i) => (
          <ArticleCard key={article.slug} article={article} index={i} />
        ))}
      </section>
    </>
  )
}
