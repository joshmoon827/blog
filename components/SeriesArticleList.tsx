'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Article } from '@/data/articles'
import { useLanguage } from '@/components/LocalizedText'
import styles from './SeriesArticleList.module.css'

type Props = {
  articles: Article[]
  className?: string
}

/** Toss Feed series article rows — text left, 5:4 thumb right. */
export default function SeriesArticleList({ articles, className }: Props) {
  const language = useLanguage()
  if (!articles.length) return null

  return (
    <ul className={`${styles.list}${className ? ` ${className}` : ''}`}>
      {articles.map((article) => {
        const tags = article.tags || []
        const eyebrow = tags[0]
        const restTags = tags.slice(1)
        const title = language === 'en' && article.title_en ? article.title_en : article.title
        const description = language === 'en' && article.description_en ? article.description_en : article.description
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
                {description ? (
                  <p className={styles.desc}>{description}</p>
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
              <div className={styles.thumb}>
                <Image
                  src={article.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 28vw, 200px"
                  className={styles.thumbImg}
                />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
