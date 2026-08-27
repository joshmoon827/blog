import { Suspense } from 'react'
import type { Metadata } from 'next'
import ArticleCard from '@/components/ArticleCard'
import ArticlesGrid from '@/components/ArticlesGrid'
import HomeCategorySlides from '@/components/HomeCategorySlides'
import type { HomeCategoryArticle } from '@/components/HomeCategoryArticleList'
import HomeInteractiveBanner from '@/components/HomeInteractiveBanner'
import SeriesArticleList from '@/components/SeriesArticleList'
import SeriesCards from '@/components/SeriesCards'
import SeriesWebglBanner from '@/components/category-webgl/SeriesWebglBanner'
import TagFilterBar from '@/components/TagFilterBar'
import {
  isInteractiveHomeSeriesMode,
  isWebglHomeSeriesMode,
} from '@/lib/homeSeriesMode'
import { resolveHomeBannerMode } from '@/lib/homeSeriesMode.server'
import { getListedArticles } from '@/lib/listedArticles'
import { getArticleBodyExcerpt } from '@/lib/articlePlainText'
import { readOne } from '@/lib/localArticles'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getPretextFeatureArticle } from '@/lib/pretextArticle.server'
import { getSeriesPreviewItems, getSeriesWithArticles } from '@/lib/seriesItems'
import { siteConfig, getDefaultDescription } from '@/lib/siteConfig'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Articles',
  description: getDefaultDescription('ko'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `Articles | ${siteConfig.siteName}`,
    description: getDefaultDescription('ko'),
    url: siteConfig.siteUrl,
    siteName: siteConfig.siteName,
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: `${siteConfig.siteUrl}/blog-logo.svg`,
        alt: siteConfig.siteName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Articles | ${siteConfig.siteName}`,
    description: getDefaultDescription('ko'),
    images: [`${siteConfig.siteUrl}/blog-logo.svg`],
  },
}
interface ArticlesPageProps {
  searchParams?: Promise<{
    tag?: string | string[]
  }>
}

async function ArticleList({ searchParams }: { searchParams?: Promise<{ tag?: string | string[] }> }) {
  const params = await searchParams
  const selectedTag = typeof params?.tag === 'string' ? params.tag : undefined
  const listed = getListedArticles()
  const filteredArticles = selectedTag
    ? listed.filter((article) => article.tags.includes(selectedTag))
    : listed

  return (
    <>
      <section className={styles.hero}>
        <TagFilterBar articles={listed} selectedTag={selectedTag} />
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

async function HomeBanner() {
  const seriesMode = await resolveHomeBannerMode()
  const mosaicPattern = readMosaicPattern()
  const seriesItems = getSeriesPreviewItems(
    seriesMode === 'mosaic' ? mosaicSlotCount(mosaicPattern) : 3,
  )
  const pretextArticle =
    seriesMode === 'pretext' ? getPretextFeatureArticle() : null

  const banner = isWebglHomeSeriesMode(seriesMode) ? (
    <SeriesWebglBanner
      items={seriesItems}
      mode={seriesMode}
      className={`${styles.seriesStrip} ${styles.seriesStripFlush}`}
    />
  ) : isInteractiveHomeSeriesMode(seriesMode) ? (
    <HomeInteractiveBanner
      items={seriesItems}
      mode={seriesMode}
      pretextArticle={pretextArticle}
      className={`${styles.seriesStrip} ${styles.seriesStripFlush}`}
    />
  ) : (
    <SeriesCards
      items={seriesItems}
      variant={seriesMode === 'slide' ? 'slide' : 'mosaic'}
      pattern={mosaicPattern}
      className={`${styles.seriesStrip} ${styles.seriesStripFlush}`}
      headerOverlay
    />
  )

  return (
    <div className={styles.homeCoverFrame}>
      <div className={styles.homeCoverCard}>{banner}</div>
    </div>
  )
}

function withBodyExcerpt(article: ReturnType<typeof getListedArticles>[number]): HomeCategoryArticle {
  const full = readOne(article.slug)
  return {
    ...article,
    excerpt: getArticleBodyExcerpt(full?.body ?? '', 100),
    excerpt_en: full?.body_en
      ? getArticleBodyExcerpt(full.body_en, 100)
      : undefined,
  }
}

function HomeCategoryArticleSlides() {
  const slides = getSeriesWithArticles()
    .filter((series) => series.articles.length > 0)
    .sort((a, b) => b.articles.length - a.articles.length)
    .map((series) => ({
      slug: series.slug,
      title: series.title,
      title_en: series.title_en,
      coverImage: series.coverImage,
      articles: series.articles.slice(0, 4).map(withBodyExcerpt),
    }))

  return <HomeCategorySlides slides={slides} />
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  return (
    <>
      <Suspense fallback={<div className={`${styles.seriesStrip} ${styles.seriesStripFlush}`} />}>
        <HomeBanner />
      </Suspense>
      <HomeCategoryArticleSlides />
      <Suspense fallback={
        <div className={styles.hero}>
          <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading articles...</div>
        </div>
      }>
        <ArticleList searchParams={searchParams} />
      </Suspense>
    </>
  )
}
