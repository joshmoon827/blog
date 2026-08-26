import { getListedArticles } from '@/lib/listedArticles'
import { readSeriesList } from '@/lib/series.server'
import type { SeriesCardItem } from '@/lib/seriesItems'
import type { SeriesRecord } from '@/lib/series'

export type RelatedHit = {
  slug: string
  title: string
  title_en?: string
  image: string
  sharedTags: string[]
  seriesSlugs: string[]
}

function norm(tag: string): string {
  return tag.trim().toLowerCase()
}

export function seriesContaining(slug: string, seriesList = readSeriesList()): SeriesRecord[] {
  return seriesList.filter((s) => (s.articleSlugs ?? []).includes(slug))
}

export function getRelatedForSlug(slug: string): RelatedHit[] {
  const articles = getListedArticles({ includeDrafts: false })
  const current = articles.find((a) => a.slug === slug)
  if (!current) return []
  const seriesList = readSeriesList()
  const mine = new Set((current.tags ?? []).map(norm).filter(Boolean))
  const mySeries = seriesContaining(slug, seriesList)
  const mySeriesSlugs = new Set(mySeries.map((s) => s.slug))

  const hits = new Map<string, RelatedHit>()
  const upsert = (article: (typeof articles)[number]) => {
    if (article.slug === slug) return
    const existing = hits.get(article.slug)
    if (existing) return existing
    const created: RelatedHit = {
      slug: article.slug,
      title: article.title,
      title_en: article.title_en,
      image: article.image,
      sharedTags: [],
      seriesSlugs: [],
    }
    hits.set(article.slug, created)
    return created
  }

  for (const article of articles) {
    if (article.slug === slug) continue
    const shared = (article.tags ?? [])
      .map(norm)
      .filter((t) => t && mine.has(t))
    if (!shared.length) continue
    const hit = upsert(article)
    if (hit) {
      hit.sharedTags = [...new Set([...hit.sharedTags, ...shared])]
    }
  }

  for (const series of mySeries) {
    for (const other of series.articleSlugs ?? []) {
      if (other === slug) continue
      const article = articles.find((a) => a.slug === other)
      if (!article) continue
      const hit = upsert(article)
      if (hit && !hit.seriesSlugs.includes(series.slug)) {
        hit.seriesSlugs.push(series.slug)
      }
    }
  }

  // Also pick up series mates when current slug is only tag-matched into a
  // series (no articleSlugs). mySeries already covers manual articleSlugs.
  for (const series of seriesList) {
    if (mySeriesSlugs.has(series.slug)) continue
    const tags = (series.matchTags ?? []).map(norm)
    const tagged = [...mine].some((t) => tags.includes(t))
    const listed = (series.articleSlugs ?? []).includes(slug)
    if (!tagged && !listed) continue
    for (const other of series.articleSlugs ?? []) {
      if (other === slug) continue
      const article = articles.find((a) => a.slug === other)
      if (!article) continue
      const hit = upsert(article)
      if (hit && !hit.seriesSlugs.includes(series.slug)) {
        hit.seriesSlugs.push(series.slug)
      }
    }
  }

  return [...hits.values()].sort((a, b) => {
    const score = (h: RelatedHit) => h.seriesSlugs.length * 10 + h.sharedTags.length
    return score(b) - score(a) || a.title.localeCompare(b.title, 'ko')
  })
}

export function hitsToSeriesCards(hits: RelatedHit[]): SeriesCardItem[] {
  return hits.map((h) => ({
    href: `/articles/${h.slug}`,
    title: h.title,
    title_en: h.title_en,
    image: h.image,
    count: 1,
    slug: h.slug,
  }))
}

export function seriesToCard(series: SeriesRecord, count: number): SeriesCardItem {
  return {
    href: `/category/${series.slug}`,
    title: series.title,
    title_en: series.title_en,
    image: series.coverImage,
    count,
    description: series.description,
    description_en: series.description_en,
    slug: series.slug,
  }
}
