import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/siteConfig'
import { readAll } from '@/lib/localArticles'
import { readSeriesList } from '@/lib/series.server'

export default function sitemap(): MetadataRoute.Sitemap {
  const allArticles = readAll().filter((a) => !a.draft && !a.trashed)
  const categories = readSeriesList()

  const articleUrls: MetadataRoute.Sitemap = allArticles.map((article) => {
    const encodedSlug = encodeURIComponent(article.slug)
    const lastModified = article.created
      ? new Date(article.created)
      : new Date()

    return {
      url: `${siteConfig.siteUrl}/articles/${encodedSlug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  })

  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteConfig.siteUrl}/category/${encodeURIComponent(category.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const latestArticleDate = allArticles.length > 0
    ? allArticles.reduce((latest, article) => {
        const articleDate = article.created ? new Date(article.created) : new Date(0)
        return articleDate > latest ? articleDate : latest
      }, new Date(0))
    : new Date()

  return [
    {
      url: siteConfig.siteUrl,
      lastModified: latestArticleDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteConfig.siteUrl}/category`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...categoryUrls,
    ...articleUrls,
  ]
}
