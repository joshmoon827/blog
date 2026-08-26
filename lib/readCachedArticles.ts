import type { Article } from '@/data/articles'

function toArticle(raw: unknown): Article | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.slug !== 'string' || typeof row.title !== 'string') return null
  if (row.draft || row.archived || row.trashed) return null
  return {
    slug: row.slug,
    title: row.title,
    description: typeof row.description === 'string' ? row.description : '',
    image: typeof row.image === 'string' ? row.image : '',
    title_en: typeof row.title_en === 'string' ? row.title_en : undefined,
    description_en:
      typeof row.description_en === 'string' ? row.description_en : undefined,
    tags: Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    related: [],
  }
}

function slugFromArticlePath(pathname: string): string | null {
  if (!pathname.startsWith('/articles/')) return null
  const slug = decodeURIComponent(pathname.slice('/articles/'.length).split('/')[0] || '')
  if (!slug || slug === 'new') return null
  return slug
}

function isArticlesApiPath(pathname: string) {
  return pathname === '/api/articles' || pathname.startsWith('/api/articles?')
}

/** Real article HTML only — skip 404/offline shells and RSC payloads. */
async function isCachedArticleHtml(response: Response): Promise<boolean> {
  if (!response.ok) return false
  const type = response.headers.get('content-type') || ''
  if (!type.includes('text/html')) return false

  const html = await response.clone().text()
  if (
    html.includes('__next_error__') ||
    html.includes('name="next-error"') ||
    html.includes('NEXT_HTTP_ERROR_FALLBACK') ||
    html.includes('aria-label="404') ||
    html.includes('aria-label="401') ||
    html.includes('aria-label="403') ||
    html.includes('aria-label="500') ||
    html.includes('aria-label="OFF version') ||
    html.includes('data-error-scene')
  ) {
    return false
  }

  return (
    html.includes('"@type":"BlogPosting"') ||
    html.includes("'@type':'BlogPosting'") ||
    /<article\b/i.test(html)
  )
}

export async function readCachedArticles(): Promise<Article[]> {
  if (typeof window === 'undefined' || !('caches' in window)) return []

  const names = await caches.keys()
  const fromApi = new Map<string, Article>()
  const htmlOk = new Set<string>()

  for (const name of names) {
    const cache = await caches.open(name)
    const keys = await cache.keys()
    for (const request of keys) {
      const url = new URL(request.url)
      // RSC flight URLs are not article pages.
      if (url.searchParams.has('_rsc')) continue

      const path = url.pathname
      const response = await cache.match(request)
      if (!response) continue

      if (isArticlesApiPath(path)) {
        try {
          const data = await response.clone().json()
          const list = Array.isArray(data) ? data : []
          for (const item of list) {
            const article = toArticle(item)
            if (article) fromApi.set(article.slug, article)
          }
        } catch {
          // ignore non-json
        }
        continue
      }

      const slug = slugFromArticlePath(path)
      if (!slug) continue
      if (await isCachedArticleHtml(response)) htmlOk.add(slug)
    }
  }

  // API list = real posts. Never invent cards from 404 URL keys.
  // If API cache is empty (offline pin only), fall back to validated HTML slugs.
  const list = fromApi.size
    ? [...fromApi.values()]
    : [...htmlOk].map(
        (slug): Article => ({
          slug,
          title: slug,
          description: '',
          image: '',
          tags: [],
          related: [],
        }),
      )

  return list.sort((a, b) => {
    const aScore = (a.image ? 2 : 0) + (a.title !== a.slug ? 1 : 0)
    const bScore = (b.image ? 2 : 0) + (b.title !== b.slug ? 1 : 0)
    return bScore - aScore
  })
}
