import { getListedArticles } from '@/lib/listedArticles'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import { readSeriesListLayout } from '@/lib/series.server'
import SeriesListAdmin from './SeriesListAdmin'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
