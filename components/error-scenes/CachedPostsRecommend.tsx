'use client'

import { useEffect, useState } from 'react'
import ArticleCard from '@/components/ArticleCard'
import ArticlesGrid from '@/components/ArticlesGrid'
import { LocalizedText } from '@/components/LocalizedText'
import SeriesArticleList from '@/components/SeriesArticleList'
import type { Article } from '@/data/articles'
import { readCachedArticles } from '@/lib/readCachedArticles'
import styles from './errorScenes.module.css'

export default function CachedPostsRecommend() {
  const [articles, setArticles] = useState<Article[] | null>(null)

  useEffect(() => {
    readCachedArticles().then((list) => setArticles(list.slice(0, 6)))
  }, [])

  if (!articles?.length) return null

  return (
    <section className={styles.cached} aria-label="Cached posts">
      <p className={styles.cachedTitle}>
        <LocalizedText ko="캐시된 블로그 보러가기" en="Open cached posts" />
      </p>
      <div className={styles.cachedGridDesktop}>
        <ArticlesGrid aria-label="Cached posts">
          {articles.map((article, i) => (
            <ArticleCard key={article.slug} article={article} index={i} />
          ))}
        </ArticlesGrid>
      </div>
      <div className={styles.cachedListMobile}>
        <SeriesArticleList articles={articles} />
      </div>
    </section>
  )
}
