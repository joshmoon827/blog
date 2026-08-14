/**
 * Single source of truth for site SEO metadata.
 */
export const siteConfig = {
  siteName: 'josh log',
  siteUrl: 'https://blog-eight-roan-97.vercel.app',
  defaultLocale: 'ko',
  author: {
    name: 'Josh Moon',
    url: 'https://blog-eight-roan-97.vercel.app',
  },
  description: {
    ko: '개발, AI, 클라우드, 오픈소스에 관한 기술 블로그',
    en: 'Technical blog about development, AI, cloud, and open source',
  },
} as const

export function getDefaultDescription(locale: 'ko' | 'en' = 'ko'): string {
  return siteConfig.description[locale]
}
