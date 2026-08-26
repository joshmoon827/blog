import type { Metadata } from 'next'
import Link from 'next/link'
import SeriesCards from '@/components/SeriesCards'
import { getListedArticles } from '@/lib/listedArticles'
import { readSeriesList } from '@/lib/series.server'
import {
  getRelatedForSlug,
  hitsToSeriesCards,
  seriesContaining,
  seriesToCard,
} from './related'
import styles from './page.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'Related posts lab | test-ui',
  robots: { index: false, follow: false },
}

const FIXTURES = [
  { slug: 'agi', label: 'agi' },
  { slug: 'dreamer', label: 'dreamer' },
] as const

function FixtureBlock({ slug, label }: { slug: string; label: string }) {
  const hits = getRelatedForSlug(slug)
  const cards = hitsToSeriesCards(hits)
  const folders = seriesContaining(slug)
  const folderCards = folders.map((s) =>
    seriesToCard(s, Math.max(0, (s.articleSlugs ?? []).length)),
  )

  return (
    <section id={slug} className={styles.section}>
      <h2>
        /articles/{label}
        {hits.length === 0 ? ' · empty (bug)' : ` · ${hits.length} related`}
      </h2>
      <p className={styles.note}>
        VaultNoteMetadata.related는 비어 있어서, 공유 태그 + category.json
        articleSlugs로 뽑는다. 카드는 본편 SeriesCards.
      </p>
      {folderCards.length > 0 ? (
        <>
          <p className={styles.note}>소속 시리즈</p>
          <SeriesCards items={folderCards} ariaLabel={`${label} series`} />
        </>
      ) : null}
      <ul className={styles.hitList}>
        {hits.map((h) => (
          <li key={h.slug}>
            <Link href={`/articles/${h.slug}`}>{h.title}</Link>
            {h.sharedTags.map((t) => (
              <span key={`t-${t}`} className={styles.signal}>
                tag:{t}
              </span>
            ))}
            {h.seriesSlugs.map((s) => (
              <span key={`s-${s}`} className={styles.signal}>
                series:{s}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <SeriesCards items={cards} ariaLabel={`${label} related articles`} />
    </section>
  )
}

export default function RelatedLabPage() {
  const coss = readSeriesList().find((s) => s.slug === 'coss-academy')
  const articles = getListedArticles({ includeDrafts: false })
  const bySlug = new Map(articles.map((a) => [a.slug, a]))
  const cossHits = (coss?.articleSlugs ?? []).map((slug) => ({
    slug,
    hits: getRelatedForSlug(slug),
  }))
  const cossCard = coss
    ? [seriesToCard(coss, (coss.articleSlugs ?? []).length)]
    : []
  const memberCards = (coss?.articleSlugs ?? []).map((slug) => {
    const article = bySlug.get(slug)
    return {
      href: `/articles/${slug}`,
      title: article?.title ?? slug,
      title_en: article?.title_en,
      image: article?.image ?? '',
      count: 1,
      slug,
    }
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · related</p>
        <h1 className={styles.pageTitle}>Related posts</h1>
        <p className={styles.lede}>
          <code>related: []</code> 대신 태그 교집합과{' '}
          <code>data/category.json</code>의 articleSlugs로 옆 글을 만든다.
          픽스처는 agi ↔ dreamer, COSS ACADEMY 시리즈.
        </p>
        <p className={styles.meta}>
          <Link href="/">← Articles</Link>
          <span aria-hidden>·</span>
          <Link href="/test-ui/obsidian-body">obsidian-body</Link>
          <span aria-hidden>·</span>
          <Link href="/test-ui/footer">footer</Link>
        </p>
      </header>
      <nav className={styles.toc} aria-label="Fixtures">
        <a href="#agi">agi</a>
        <a href="#dreamer">dreamer</a>
        <a href="#coss-academy">COSS ACADEMY</a>
      </nav>

      {FIXTURES.map((f) => (
        <FixtureBlock key={f.slug} slug={f.slug} label={f.label} />
      ))}

      <section id="coss-academy" className={styles.section}>
        <h2>COSS ACADEMY series</h2>
        <p className={styles.note}>
          category.json articleSlugs:{' '}
          {(coss?.articleSlugs ?? []).join(', ') || '(none)'}
        </p>
        <SeriesCards items={cossCard} ariaLabel="COSS ACADEMY series" />
        <ul className={styles.hitList}>
          {cossHits.map((row) => (
            <li key={row.slug}>
              <Link href={`/articles/${row.slug}`}>{row.slug}</Link>
              <span className={styles.signal}>series:coss-academy</span>
              <span className={styles.signal}>{row.hits.length} related</span>
            </li>
          ))}
        </ul>
        <SeriesCards items={memberCards} ariaLabel="COSS ACADEMY articles" />
      </section>
    </div>
  )
}
