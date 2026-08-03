import ArticleCard from '@/components/ArticleCard'
import TagFilterBar from '@/components/TagFilterBar'
import { getListedArticles } from '@/lib/listedArticles'
import styles from './page.module.css'

interface ArticlesPageProps {
  searchParams?: Promise<{
    tag?: string | string[]
  }>
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams
  const selectedTag = typeof params?.tag === 'string' ? params.tag : undefined
  const listed = getListedArticles()
  const filteredArticles = selectedTag
    ? listed.filter((article) => article.tags.includes(selectedTag))
    : listed

  return (
    <>
      <section className={styles.hero}>
        <TagFilterBar articles={listed} selectedTag={selectedTag} />
      </section>
      <section className={styles.grid} aria-label="Articles">
        {filteredArticles.map((article, i) => (
          <ArticleCard key={article.slug} article={article} index={i} />
        ))}
      </section>
    </>
  )
}
