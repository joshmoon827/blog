import Link from 'next/link'
import { notFound } from 'next/navigation'
import ArticleCard from '@/components/ArticleCard'
import { collectTagsFromArticles, countArticlesByTag } from '@/data/metadata'
import { getListedArticles } from '@/lib/listedArticles'
import styles from './page.module.css'

interface TagDesignExamplePageProps {
  params: Promise<{ exampleSlug: string }>
  searchParams?: Promise<{
    tag?: string | string[]
  }>
}

const examples = [
  {
    slug: 'example1',
    title: 'Soft Capsule Filters',
    description: 'Large rounded chips with a gentle lift, tuned for roomy desktop filter bars.',
    className: 'softCapsule',
  },
  {
    slug: 'example2',
    title: 'Segmented Control Rail',
    description: 'A connected rail treatment for compact category switching across a wide viewport.',
    className: 'segmentedRail',
  },
  {
    slug: 'example3',
    title: 'Glass Outline Tags',
    description: 'Translucent outlined tags that stay subtle against both light and dark themes.',
    className: 'glassOutline',
  },
  {
    slug: 'example4',
    title: 'Editorial Underline Tabs',
    description: 'Text-led filters with a confident underline for content-heavy desktop pages.',
    className: 'editorialUnderline',
  },
  {
    slug: 'example5',
    title: 'Metric Count Pills',
    description: 'Filter chips paired with small counts for browsing large article archives.',
    className: 'metricPills',
  },
  {
    slug: 'example6',
    title: 'Command Palette Tags',
    description: 'Keyboard-forward tags inspired by command menus and power-user dashboards.',
    className: 'commandPalette',
  },
  {
    slug: 'example7',
    title: 'Layered Cards',
    description: 'Individual tag cards with depth and strong hit targets for desktop scanning.',
    className: 'layeredCards',
  },
  {
    slug: 'example8',
    title: 'Sidebar Filter Stack',
    description: 'A vertical desktop filter pattern for layouts with a persistent content rail.',
    className: 'sidebarStack',
  },
  {
    slug: 'example9',
    title: 'Neon Focus Rings',
    description: 'High-contrast focus styling for exploratory prototypes and active states.',
    className: 'neonRings',
  },
  {
    slug: 'example10',
    title: 'Dense Toolbar Tags',
    description: 'A compact toolbar treatment for dense desktop interfaces with many filters.',
    className: 'denseToolbar',
  },
] as const

type Example = (typeof examples)[number]

export function generateStaticParams() {
  return examples.map((example) => ({ exampleSlug: example.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ exampleSlug: string }> }) {
  const { exampleSlug } = await params
  const example = getExample(exampleSlug)

  return {
    title: example ? `${example.title} | Tag Design Examples` : 'Tag Design Example',
    description: example?.description ?? 'Desktop tag design example.',
  }
}

export default async function TagDesignExamplePage({ params, searchParams }: TagDesignExamplePageProps) {
  const { exampleSlug } = await params
  const query = await searchParams
  const example = getExample(exampleSlug)

  if (!example) {
    notFound()
  }

  const selectedTag = typeof query?.tag === 'string' ? query.tag : undefined
  const articles = getListedArticles()
  const tags = collectTagsFromArticles(articles)
  const tagCounts = tags.reduce<Record<string, number>>((counts, tag) => {
    counts[tag] = countArticlesByTag(tag, articles)
    return counts
  }, {})
  const filteredArticles = selectedTag ? articles.filter((article) => article.tags.includes(selectedTag)) : articles
  const currentIndex = examples.findIndex((item) => item.slug === example.slug)
  const previousExample = examples[(currentIndex + examples.length - 1) % examples.length]
  const nextExample = examples[(currentIndex + 1) % examples.length]

  return (
    <section className={styles.page} aria-labelledby="tag-example-title">
      <div className={styles.header}>
        <p className={styles.kicker}>Desktop Tag Design Examples</p>
        <h1 id="tag-example-title">{example.title}</h1>
        <p>{example.description}</p>
      </div>

      <nav className={styles.exampleNav} aria-label="Tag design examples">
        {examples.map((item, index) => (
          <Link
            key={item.slug}
            href={getExampleHref(item.slug, selectedTag)}
            className={item.slug === example.slug ? styles.exampleNavActive : ''}
            aria-current={item.slug === example.slug ? 'page' : undefined}
          >
            {index + 1}
          </Link>
        ))}
      </nav>

      <div className={`${styles.preview} ${styles[example.className]}`}>
        <div className={styles.previewHeader}>
          <span>Filter articles</span>
          <span>
            {filteredArticles.length} / {articles.length} articles
          </span>
        </div>
        <TagList
          example={example}
          selectedTag={selectedTag}
          articles={articles}
          tags={tags}
          tagCounts={tagCounts}
        />
      </div>

      <section className={styles.articleSection} aria-label="Filtered articles">
        <div className={styles.articleHeader}>
          <h2>{selectedTag ? `${selectedTag} articles` : 'All articles'}</h2>
          <p>Use the same tags on each numbered URL to compare how the desktop filter design feels with real content.</p>
        </div>
        <div className={styles.grid}>
          {filteredArticles.map((article, i) => (
            <ArticleCard key={article.slug} article={article} index={i} />
          ))}
        </div>
      </section>

      <div className={styles.pager} aria-label="Previous and next examples">
        <Link href={getExampleHref(previousExample.slug, selectedTag)}>Previous: {previousExample.title}</Link>
        <Link href={getExampleHref(nextExample.slug, selectedTag)}>Next: {nextExample.title}</Link>
      </div>
    </section>
  )
}

function getExample(slug: string) {
  return examples.find((example) => example.slug === slug)
}

function getExampleHref(exampleSlug: string, tag?: string) {
  return tag ? `/test-ui/${exampleSlug}?tag=${encodeURIComponent(tag)}` : `/test-ui/${exampleSlug}`
}

function TagList({
  example,
  selectedTag,
  articles,
  tags,
  tagCounts,
}: {
  example: Example
  selectedTag?: string
  articles: ReturnType<typeof getListedArticles>
  tags: string[]
  tagCounts: Record<string, number>
}) {
  return (
    <ul className={styles.tagList} aria-label={`${example.title} tags`}>
      <li>
        <Link href={getExampleHref(example.slug)} className={!selectedTag ? styles.tagActive : ''} aria-current={!selectedTag ? 'true' : undefined}>
          <span>All</span>
          {example.className === 'metricPills' && <small>{articles.length}</small>}
          {example.className === 'commandPalette' && <kbd>A</kbd>}
        </Link>
      </li>
      {tags.map((tag, index) => {
        const isActive = selectedTag === tag

        return (
          <li key={tag}>
            <Link href={getExampleHref(example.slug, tag)} className={isActive ? styles.tagActive : ''} aria-current={isActive ? 'true' : undefined}>
              <span>{tag}</span>
              {example.className === 'metricPills' && <small>{tagCounts[tag]}</small>}
              {example.className === 'commandPalette' && <kbd>{index + 1}</kbd>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
