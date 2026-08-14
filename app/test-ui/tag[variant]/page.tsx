import Link from 'next/link'
import { notFound } from 'next/navigation'
import ArticleCard from '@/components/ArticleCard'
import TagFilterBar from '@/components/TagFilterBar'
import { collectTagsFromArticles, countArticlesByTag } from '@/data/metadata'
import { getTagGlassHref, getTagGlassVariant, TAG_GLASS_VARIANTS } from '@/data/tagGlassVariants'
import { getListedArticles } from '@/lib/listedArticles'
import styles from './page.module.css'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface TagGlassExamplePageProps {
  params: Promise<{ variant: string }>
  searchParams?: Promise<{
    tag?: string | string[]
  }>
}

export function generateStaticParams() {
  return TAG_GLASS_VARIANTS.map((variant) => ({ variant: variant.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ variant: string }> }) {
  const { variant: slug } = await params
  const variant = getTagGlassVariant(slug)

  return {
    title: variant ? `${variant.title} | Glass Tag Examples` : 'Glass Tag Example',
    description: variant?.description ?? 'Glassmorphism tag filter example.',
  }
}

export default async function TagGlassExamplePage({ params, searchParams }: TagGlassExamplePageProps) {
  const { variant: slug } = await params
  const query = await searchParams
  const variant = getTagGlassVariant(slug)

  if (!variant) {
    notFound()
  }

  const selectedTag = typeof query?.tag === 'string' ? query.tag : undefined
  const articles = getListedArticles()
  const filteredArticles = selectedTag ? articles.filter((article) => article.tags.includes(selectedTag)) : articles
  const basePath = `/test-ui/tag${variant.slug}`

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.kicker}>Glass Tag Examples</p>
          <h1>{variant.title}</h1>
          <p>{variant.description}</p>
          <nav className={styles.variantNav} aria-label="Glass tag variants">
            {TAG_GLASS_VARIANTS.map((item) => (
              <Link
                key={item.slug}
                href={getTagGlassHref(item.slug, selectedTag)}
                className={item.slug === variant.slug ? styles.variantNavActive : ''}
                aria-current={item.slug === variant.slug ? 'page' : undefined}
              >
                {item.slug}
              </Link>
            ))}
          </nav>
        </div>
        <TagFilterBar articles={articles} selectedTag={selectedTag} basePath={basePath} variant={variant.id} />
      </section>
      <section className={styles.grid} aria-label="Articles">
        {filteredArticles.map((article, i) => (
          <ArticleCard key={article.slug} article={article} index={i} />
        ))}
      </section>
    </>
  )
}
