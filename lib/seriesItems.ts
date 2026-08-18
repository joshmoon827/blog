import type { Article } from '@/data/articles'
import { getListedArticles } from '@/lib/listedArticles'
import {
  articleMatchesSeries,
  seriesUsesManualArticles,
  type SeriesRecord,
} from '@/lib/series'
import { readSeriesList } from '@/lib/series.server'

export type SeriesCardItem = {
  href: string
  title: string
  title_en?: string
  image: string
  count: number
  description?: string
  description_en?: string
  slug?: string
}

export type SeriesWithArticles = SeriesRecord & {
  articles: Article[]
}

/**
 * Resolve articles per series.
 * Manual `articleSlugs` wins (ordered); remaining go to tag-matched series.
 */
export function partitionArticlesBySeries(
  seriesList: SeriesRecord[] = readSeriesList(),
): Map<string, Article[]> {
  const all = getListedArticles({ includeDrafts: false })
  const bySlug = new Map(all.map((a) => [a.slug, a]))
  const map = new Map<string, Article[]>(seriesList.map((s) => [s.slug, []]))
  const claimed = new Set<string>()

  for (const series of seriesList) {
    if (!seriesUsesManualArticles(series)) continue
    const list: Article[] = []
    for (const slug of series.articleSlugs ?? []) {
      const article = bySlug.get(slug)
      if (!article || claimed.has(slug)) continue
      list.push(article)
      claimed.add(slug)
    }
    map.set(series.slug, list)
  }

  for (const series of seriesList) {
    if (seriesUsesManualArticles(series)) continue
    const list = map.get(series.slug) ?? []
    for (const article of all) {
      if (claimed.has(article.slug)) continue
      if (!articleMatchesSeries(article, series)) continue
      list.push(article)
      claimed.add(article.slug)
    }
    map.set(series.slug, list)
  }

  return map
}

export function getArticlesForSeries(series: SeriesRecord): Article[] {
  return partitionArticlesBySeries().get(series.slug) ?? []
}

export function getSeriesWithArticles(): SeriesWithArticles[] {
  const list = readSeriesList()
  const partitioned = partitionArticlesBySeries(list)
  return list.map((series) => ({
    ...series,
    articles: partitioned.get(series.slug) ?? [],
  }))
}

export function getSeriesDetail(slug: string): SeriesWithArticles | null {
  const key = slug.trim().toLowerCase()
  return getSeriesWithArticles().find((s) => s.slug === key) ?? null
}

/** Home /series preview cards — one card per series folder. */
export function getSeriesPreviewItems(
  limit = 3,
  _excludeSlug?: string,
): SeriesCardItem[] {
  const folders = getSeriesWithArticles()
  return folders.slice(0, limit).map((s) => ({
    href: `/category/${s.slug}`,
    title: s.title,
    title_en: s.title_en,
    image: s.coverImage,
    count: Math.max(0, s.articles.length),
    description: s.description,
    description_en: s.description_en,
    slug: s.slug,
  }))
}
