import { getListedArticles } from '@/lib/listedArticles'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import { readSeriesListLayout } from '@/lib/series.server'
import SeriesListAdmin from './SeriesListAdmin'

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
