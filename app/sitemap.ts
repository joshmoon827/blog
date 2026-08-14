import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/siteConfig'
import { getListedArticles } from '@/lib/listedArticles'
import { readSeriesList } from '@/lib/series.server'

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getListedArticles({ includeDrafts: false })
  const categories = readSeriesList()

  const articleUrls: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteConfig.siteUrl}/articles/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteConfig.siteUrl}/category/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    {
      url: siteConfig.siteUrl,
      lastModified: new Date(),
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
