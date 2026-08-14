import ArticleCard from '@/components/ArticleCard'
import ArticlesGrid from '@/components/ArticlesGrid'
import Link from 'next/link'
import { getArchivedArticles } from '@/lib/listedArticles'
import styles from './page.module.css'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: '보관 글 | josh log',
}

export default function ArchivedPage() {
  const archived = getArchivedArticles()

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Link href="/">← Articles</Link>
        </p>
        <h1 className={styles.title}>보관</h1>
        <p className={styles.sub}>
          {archived.length === 0
            ? '보관한 글이 없습니다.'
            : `${archived.length}개의 보관 글`}
        </p>
      </section>
      <ArticlesGrid className={styles.grid} aria-label="보관 글">
        {archived.map((article, i) => (
          <ArticleCard key={article.slug} article={article} index={i} />
        ))}
      </ArticlesGrid>
    </>
  )
}
