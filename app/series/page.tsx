import { getListedArticles } from '@/lib/listedArticles'
import { LocalizedArticleCount } from '@/components/LocalizedText'
import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'

export default function SeriesPage() {
  const articles = getListedArticles({ includeDrafts: false })
  const series = articles.slice(0, 4).map((article, index) => ({
    href: `/articles/${article.slug}`,
    title: article.title,
    image: article.image,
    count: Math.max(1, articles.length - index),
  }))

  return (
    <>
      <section className={styles.hero}>
        <h1>Series</h1>
        <p>Articles gathered into one continuous reading path.</p>
      </section>
      <section className={styles.list} aria-label="Series">
        {series.map((item) => (
          <Link key={item.title} href={item.href} className={styles.card}>
            <div className={styles.imageWrap}>
              <Image src={item.image} alt="" fill sizes="(max-width: 640px) 100vw, 1200px" className={styles.image} />
            </div>
            <div className={styles.scrim} />
            <div className={styles.content}>
              <div className={styles.titleBlock}>
                <div className={styles.label}>
                  <span className={styles.labelIcon} aria-hidden="true" />
                  <span>Series</span>
                </div>
                <h2>{item.title}</h2>
              </div>
              <span className={styles.count}>
                <LocalizedArticleCount count={item.count} />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </>
  )
}
