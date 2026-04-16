import { articles } from '@/data/articles'
import ArticleCard from '@/components/ArticleCard'
import styles from './page.module.css'

export default function ArticlesPage() {
  return (
    <>
      <section className={styles.hero}>
        <h1>Selected articles on the intersection of psychology and user experience.</h1>
      </section>
      <section className={styles.grid} aria-label="Articles">
        {articles.map((article, i) => (
          <ArticleCard key={article.slug} article={article} index={i} />
        ))}
      </section>
    </>
  )
}
