'use client'

import Link from 'next/link'
import type { Article } from '@/data/articles'
import CoverListThumb from '@/components/CoverListThumb'
import { useLanguage } from '@/components/LocalizedText'
import styles from './SeriesArticleList.module.css'

export type HomeCategoryArticle = Article & {
  excerpt: string
  excerpt_en?: string
}

type Props = {
  articles: HomeCategoryArticle[]
  className?: string
}

/** Home category slides — body excerpt instead of description. */
export default function HomeCategoryArticleList({ articles, className }: Props) {
  const language = useLanguage()
  if (!articles.length) return null

  return (
    <ul className={`${styles.list}${className ? ` ${className}` : ''}`}>
      {articles.map((article) => {
        const tags = article.tags || []
        const eyebrow = tags[0]
        const restTags = tags.slice(1)
        const title = language === 'en' && article.title_en ? article.title_en : article.title
        const excerpt =
          language === 'en' && article.excerpt_en ? article.excerpt_en : article.excerpt
        return (
          <li key={article.slug}>
            <Link
              href={`/articles/${article.slug}`}
              className={styles.row}
            >
              <div className={styles.text}>
                {eyebrow ? (
                  <span className={styles.eyebrow}>{eyebrow}</span>
                ) : null}
                <h3 className={styles.title}>{title}</h3>
                {excerpt ? (
                  <p className={styles.desc}>{excerpt}</p>
                ) : null}
                {restTags.length ? (
                  <p className={styles.tags}>
                    {restTags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              <CoverListThumb
                src={article.image}
                sizes="(max-width: 640px) 28vw, 200px"
                className={styles.thumb}
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
