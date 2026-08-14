import type { Metadata } from 'next'
import { getListedArticles } from '@/lib/listedArticles'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import { readSeriesListLayout } from '@/lib/series.server'
import { siteConfig } from '@/lib/siteConfig'
import SeriesListAdmin from './SeriesListAdmin'

export const metadata: Metadata = {
  title: 'Category',
  description: '기술 블로그의 카테고리별 글 모음',
  alternates: {
    canonical: '/category',
  },
  openGraph: {
    title: `Category | ${siteConfig.siteName}`,
    description: '기술 블로그의 카테고리별 글 모음',
    url: `${siteConfig.siteUrl}/category`,
    siteName: siteConfig.siteName,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `Category | ${siteConfig.siteName}`,
    description: '기술 블로그의 카테고리별 글 모음',
  },
}

export default function SeriesPage() {
  const series = getSeriesPreviewItems(32)
  const layout = readSeriesListLayout()
  const articles = getListedArticles({ includeDrafts: false }).map((a) => ({
    slug: a.slug,
    title: a.title,
  }))

  return (
    <SeriesListAdmin
      items={series}
      initialLayout={layout}
      articles={articles}
    />
  )
}
