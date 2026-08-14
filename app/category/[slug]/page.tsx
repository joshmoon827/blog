import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getListedArticles } from '@/lib/listedArticles'
import { getSeriesDetail } from '@/lib/seriesItems'
import { siteConfig } from '@/lib/siteConfig'
import SeriesDetail from './SeriesDetail'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const detail = getSeriesDetail(slug)
  if (!detail) return { title: 'Category' }

  const categoryUrl = `${siteConfig.siteUrl}/category/${slug}`
  const imageUrl = detail.coverImage.startsWith('http')
    ? detail.coverImage
    : `${siteConfig.siteUrl}${detail.coverImage}`

  return {
    title: detail.title,
    description: detail.description,
    alternates: {
      canonical: `/category/${slug}`,
    },
    openGraph: {
      title: `${detail.title} | ${siteConfig.siteName}`,
      description: detail.description,
      url: categoryUrl,
      siteName: siteConfig.siteName,
      locale: 'ko_KR',
      type: 'website',
      images: [
        {
          url: imageUrl,
          alt: detail.title,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: `${detail.title} | ${siteConfig.siteName}`,
      description: detail.description,
      images: [imageUrl],
    },
  }
}

export default async function SeriesSlugPage({ params }: Props) {
  const { slug } = await params
  const detail = getSeriesDetail(slug)
  if (!detail) notFound()

  return (
    <SeriesDetail
      series={{
        slug: detail.slug,
        title: detail.title,
        description: detail.description,
        coverImage: detail.coverImage,
        matchTags: detail.matchTags,
        articleSlugs: detail.articleSlugs,
      }}
      articles={detail.articles}
      allArticles={getListedArticles({ includeDrafts: false })}
    />
  )
}
