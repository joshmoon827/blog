import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { articles, getArticleBySlug } from '@/data/articles'
import styles from './page.module.css'

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  return { title: article ? `${article.title} | Laws of UX` : 'Not Found' }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  return (
    <article className={styles.article}>
      <div className={styles.banner}>
        <div className={styles.bannerImage}>
          <Image
            src={article.image}
            alt={article.title}
            fill
            sizes="100vw"
            className={styles.bannerImg}
            priority
          />
        </div>
      </div>
      <div className={styles.content}>
        <Link href="/" className={styles.back}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All Articles
        </Link>
        <h1 className={styles.title}>{article.title}</h1>
        <p className={styles.description}>{article.description}</p>
      </div>
    </article>
  )
}
