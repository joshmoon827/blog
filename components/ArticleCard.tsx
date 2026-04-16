'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Article } from '@/data/articles'
import ImageCarousel from './ImageCarousel'
import styles from './ArticleCard.module.css'

interface Props {
  article: Article
  index: number
}

export default function ArticleCard({ article, index }: Props) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push(`/articles/${article.slug}`)
  }

  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Link href={`/articles/${article.slug}`} className={styles.thumbLink} onClick={handleClick} tabIndex={-1} aria-hidden>
        <ImageCarousel offset={index} alt={article.title} />
      </Link>
      <div className={styles.body}>
        <h2 className={styles.title}>
          <Link href={`/articles/${article.slug}`} onClick={handleClick}>
            {article.title}
          </Link>
        </h2>
        <p className={styles.desc}>{article.description}</p>
      </div>
    </motion.article>
  )
}
