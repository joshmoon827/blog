import ArticleCard from '@/components/ArticleCard'
import ArticlesGrid from '@/components/ArticlesGrid'
import SeriesArticleList from '@/components/SeriesArticleList'
import TagFilterBar from '@/components/TagFilterBar'
import { getListedArticles } from '@/lib/listedArticles'
import styles from './HomeArticleIndex.module.css'

export type HomeArticleIndexSearchParams = Promise<{
  tag?: string | string[]
}>

interface HomeArticleIndexProps {
  searchParams?: HomeArticleIndexSearchParams
  basePath?: '/' | '/home'
}

export default async function HomeArticleIndex({ searchParams, basePath = '/' }: HomeArticleIndexProps) {
  const params = await searchParams
  const selectedTag = typeof params?.tag === 'string' ? params.tag : undefined
  const listed = getListedArticles()
  const filteredArticles = selectedTag
    ? listed.filter((article) => article.tags.includes(selectedTag))
    : listed

  return (
    <>
      <section className={styles.hero}>
        <TagFilterBar articles={listed} selectedTag={selectedTag} basePath={basePath} />
      </section>
      <div className={styles.gridDesktop}>
        <ArticlesGrid className={styles.grid} aria-label="Articles">
          {filteredArticles.map((article, i) => (
            <ArticleCard key={article.slug} article={article} index={i} />
          ))}
        </ArticlesGrid>
      </div>
      <div className={styles.listMobile}>
        <SeriesArticleList articles={filteredArticles} />
      </div>
    </>
  )
}
