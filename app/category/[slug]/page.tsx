import { notFound } from 'next/navigation'
import { getListedArticles } from '@/lib/listedArticles'
import { getSeriesDetail } from '@/lib/seriesItems'
import SeriesDetail from './SeriesDetail'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const detail = getSeriesDetail(slug)
  if (!detail) return { title: 'Category' }
  return {
    title: `${detail.title} | Category`,
    description: detail.description,
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
