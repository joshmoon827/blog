import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/siteConfig'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings/', '/login/', '/drafts/', '/archived/', '/newrite/', '/test-ui/'],
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  }
}
