/**
 * Single source of truth for site SEO metadata.
 * 
 * Production URL resolution (in priority order):
 * 1. VERCEL_PROJECT_PRODUCTION_URL (set by Vercel for the canonical production deployment)
 * 2. NEXT_PUBLIC_SITE_URL (custom domain via env var)
 * 3. SITE_URL (server-side custom domain)
 * 4. Fallback to localhost in development (never baked into builds)
 */
function getProductionUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProdUrl) {
    return `https://${vercelProdUrl}`
  }
  
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (publicSiteUrl) {
    return publicSiteUrl.startsWith('http') ? publicSiteUrl : `https://${publicSiteUrl}`
  }
  
  const siteUrl = process.env.SITE_URL
  if (siteUrl) {
    return siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  }
  
  return 'http://localhost:3000'
}

export const siteConfig = {
  siteName: 'josh log',
  siteUrl: getProductionUrl(),
  defaultLocale: 'ko',
  author: {
    name: 'Josh Moon',
    url: getProductionUrl(),
  },
  description: {
    ko: '개발, AI, 클라우드, 오픈소스에 관한 기술 블로그',
    en: 'Technical blog about development, AI, cloud, and open source',
  },
} as const

export function getDefaultDescription(locale: 'ko' | 'en' = 'ko'): string {
  return siteConfig.description[locale]
}
