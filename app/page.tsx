import { Suspense } from 'react'
import type { Metadata } from 'next'
import ArticleCard from '@/components/ArticleCard'
import ArticlesGrid from '@/components/ArticlesGrid'
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
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getPretextFeatureArticle } from '@/lib/pretextArticle.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
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

  if (isWebglHomeSeriesMode(seriesMode)) {
    return (
      <SeriesWebglBanner
        items={seriesItems}
        mode={seriesMode}
        className={`${styles.seriesStrip} ${styles.seriesStripFlush}`}
      />
    )
  }
  if (isInteractiveHomeSeriesMode(seriesMode)) {
    return (
      <HomeInteractiveBanner
        items={seriesItems}
        mode={seriesMode}
        pretextArticle={pretextArticle}
        className={`${styles.seriesStrip} ${styles.seriesStripFlush}`}
      />
    )
  }
  return (
    <SeriesCards
      items={seriesItems}
      variant={seriesMode === 'slide' ? 'slide' : 'mosaic'}
      pattern={mosaicPattern}
      className={styles.seriesStrip}
      ariaLabel="Category"
    />
  )
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  return (
    <>
      <Suspense fallback={<div className={`${styles.seriesStrip} ${styles.seriesStripFlush}`} />}>
        <HomeBanner />
      </Suspense>
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
