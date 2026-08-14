/**
 * Series = folder of related articles (not a big article card).
 * Covers are series-owned (user-uploaded), separate from article covers.
 */

export type SeriesRecord = {
  slug: string
  title: string
  description: string
  /** Public URL path, e.g. /images/category/cloud.jpg */
  coverImage: string
  /**
   * Tag matchers (lowercase). An article joins the first series whose
   * matcher hits a tag or (fallback) title keyword.
   */
  matchTags: string[]
  /**
   * When set (including `[]`), membership + order is manual.
   * When omitted, articles are assigned by `matchTags`.
   */
  articleSlugs?: string[]
}

/** /series list page grid (max 3 columns). */
export type SeriesListLayout = {
  /** Desktop columns: 1–3 */
  columns: 1 | 2 | 3
  /** When true, the first card spans the full row (classic 1+2 layout on 2-col). */
  featuredFirst: boolean
}

export type SeriesFile = {
  layout: SeriesListLayout
  series: SeriesRecord[]
}

export const DEFAULT_SERIES_LIST_LAYOUT: SeriesListLayout = {
  columns: 2,
  featuredFirst: false,
}

export function uniqueSeriesSlug(title: string, existing: string[]): string {
  const used = new Set(existing.map((s) => s.trim().toLowerCase()))
  let base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  if (!base) base = `series-${Date.now().toString(36)}`
  let slug = base
  let n = 2
  while (used.has(slug)) {
    slug = `${base}-${n++}`
  }
  return slug
}

export function sanitizeSeriesListLayout(raw: unknown): SeriesListLayout {
  const obj =
    raw && typeof raw === 'object' ? (raw as Partial<SeriesListLayout>) : {}
  const n = Math.round(Number(obj.columns))
  const columns: 1 | 2 | 3 = n === 1 || n === 3 ? n : 2
  return {
    columns,
    featuredFirst: Boolean(obj.featuredFirst),
  }
}

export const DEFAULT_SERIES_COVERS = {
  cloud: '/images/choice-overload.jpg',
  opensource: '/images/law-of-proximity.jpg',
  ai: '/images/millers-law.jpg',
} as const

/** Built-in folders — Cloud / Open Source / AI */
export const DEFAULT_SERIES: SeriesRecord[] = [
  {
    slug: 'cloud',
    title: '클라우드',
    description: '인프라, 컨테이너, 클라우드 운영과 보안.',
    coverImage: DEFAULT_SERIES_COVERS.cloud,
    matchTags: [
      'cloud',
      'docker',
      'openstack',
      'k8s',
      'kubernetes',
      'devops',
      'security',
      'supply-chain',
      'infrastructure',
      '네트워크',
      '클라우드',
    ],
  },
  {
    slug: 'opensource',
    title: '오픈소스',
    description: '오픈소스 도구, 런타임, 개발 환경.',
    coverImage: DEFAULT_SERIES_COVERS.opensource,
    matchTags: [
      'oss',
      'open-source',
      'opensource',
      'javascript',
      'v8',
      'obsidian',
      'tools',
      'cli',
      'cursor',
      'acp',
      'ide',
      '오픈소스',
    ],
  },
  {
    slug: 'ai',
    title: 'AI',
    description: 'LLM, 에이전트, 학습과 프롬프트.',
    coverImage: DEFAULT_SERIES_COVERS.ai,
    matchTags: [
      'ai',
      'llm',
      'rag',
      'prompt',
      'agent',
      'agi',
      'world-model',
      'rl',
      '아이디어',
      'ai-separation',
    ],
  },
]

function clampStr(raw: unknown, max: number, fallback = ''): string {
  if (typeof raw !== 'string') return fallback
  return raw.trim().slice(0, max) || fallback
}

export function sanitizeSeriesRecord(
  raw:
    | (Omit<Partial<SeriesRecord>, 'articleSlugs'> & {
        articleSlugs?: string[] | null
      })
    | null
    | undefined,
  fallback?: SeriesRecord,
): SeriesRecord | null {
  const base = fallback
  const slug = clampStr(raw?.slug ?? base?.slug, 64)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) return null

  const matchTags = Array.isArray(raw?.matchTags)
    ? raw!.matchTags
        .map((t) => String(t).trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 64)
    : base?.matchTags ?? []

  let articleSlugs: string[] | undefined
  if (raw != null && Object.prototype.hasOwnProperty.call(raw, 'articleSlugs')) {
    if (Array.isArray(raw.articleSlugs)) {
      const seen = new Set<string>()
      articleSlugs = []
      for (const s of raw.articleSlugs) {
        const key = String(s).trim()
        if (!key || seen.has(key)) continue
        seen.add(key)
        articleSlugs.push(key)
        if (articleSlugs.length >= 500) break
      }
    } else {
      articleSlugs = undefined
    }
  } else if (Array.isArray(base?.articleSlugs)) {
    articleSlugs = base.articleSlugs.slice(0, 500)
  }

  return {
    slug,
    title: clampStr(raw?.title ?? base?.title, 80, slug),
    description: clampStr(raw?.description ?? base?.description, 400),
    coverImage: clampStr(
      raw?.coverImage ?? base?.coverImage,
      500,
      DEFAULT_SERIES_COVERS.cloud,
    ),
    matchTags,
    ...(articleSlugs !== undefined ? { articleSlugs } : {}),
  }
}

/** True when this series uses an explicit article list (not tag auto-match). */
export function seriesUsesManualArticles(series: SeriesRecord): boolean {
  return Array.isArray(series.articleSlugs)
}

export function sanitizeSeriesList(raw: unknown): SeriesRecord[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { series?: unknown }).series)
      ? (raw as { series: unknown[] }).series
      : null

  if (!list?.length) return DEFAULT_SERIES.map((s) => ({ ...s }))

  const bySlug = new Map(DEFAULT_SERIES.map((s) => [s.slug, s]))
  const out: SeriesRecord[] = []
  const seen = new Set<string>()

  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const fallback = bySlug.get(String((item as SeriesRecord).slug || ''))
    const next = sanitizeSeriesRecord(item as SeriesRecord, fallback)
    if (!next || seen.has(next.slug)) continue
    seen.add(next.slug)
    out.push(next)
  }

  // Ensure the three defaults always exist.
  for (const def of DEFAULT_SERIES) {
    if (!seen.has(def.slug)) {
      out.push({ ...def })
      seen.add(def.slug)
    }
  }

  return out
}

export function sanitizeSeriesFile(raw: unknown): SeriesFile {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    layout: sanitizeSeriesListLayout(obj.layout),
    series: sanitizeSeriesList(raw),
  }
}

/** Reorder series by slug list; unknown slugs ignored; missing kept at end. */
export function reorderSeriesBySlugs(
  list: SeriesRecord[],
  order: string[],
): SeriesRecord[] {
  const bySlug = new Map(list.map((s) => [s.slug, s]))
  const out: SeriesRecord[] = []
  const seen = new Set<string>()
  for (const slug of order) {
    const key = String(slug).trim().toLowerCase()
    const hit = bySlug.get(key)
    if (!hit || seen.has(key)) continue
    out.push(hit)
    seen.add(key)
  }
  for (const s of list) {
    if (!seen.has(s.slug)) out.push(s)
  }
  return out
}

export function articleMatchesSeries(
  article: { slug: string; title: string; tags?: string[] },
  series: SeriesRecord,
): boolean {
  if (series.articleSlugs?.includes(article.slug)) return true
  const tags = (article.tags || []).map((t) => t.toLowerCase())
  if (series.matchTags.some((m) => tags.includes(m))) return true
  const title = article.title.toLowerCase()
  return series.matchTags.some((m) => m.length >= 2 && title.includes(m))
}

/** First matching series wins; unmatched articles are omitted from folders. */
export function pickSeriesForArticle(
  article: { slug: string; title: string; tags?: string[] },
  seriesList: SeriesRecord[],
): SeriesRecord | null {
  for (const s of seriesList) {
    if (articleMatchesSeries(article, s)) return s
  }
  return null
}
