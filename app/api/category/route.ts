import { NextRequest, NextResponse } from 'next/server'
import { unauthorizedIfGuest } from '@/lib/requireAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import {
  reorderSeriesBySlugs,
  sanitizeSeriesListLayout,
  type SeriesListLayout,
} from '@/lib/series'
import { getSeriesWithArticles } from '@/lib/seriesItems'
import {
  createSeries,
  readSeriesFile,
  writeSeriesCoverBytes,
  writeSeriesFile,
} from '@/lib/series.server'
import {
  MAX_IMAGE_BYTES,
  validateImageFile,
} from '@/lib/githubImageUpload'


async function coverFromFormFile(file: File, slugHint: string) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw Object.assign(
      new Error(`Image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit`),
      { status: 413 },
    )
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  const mime = file.type || 'application/octet-stream'
  const validated = validateImageFile(mime, bytes.length)
  if (!validated.ok) {
    throw Object.assign(new Error(validated.error), { status: validated.status })
  }
  const ext =
    mime === 'image/png'
      ? 'png'
      : mime === 'image/webp'
        ? 'webp'
        : mime === 'image/gif'
          ? 'gif'
          : 'jpg'
  return writeSeriesCoverBytes(slugHint, bytes, ext)
}

/** GET /api/category — folder list + layout + article counts */
export async function GET() {
  const file = readSeriesFile()
  const series = getSeriesWithArticles().map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description,
    coverImage: s.coverImage,
    matchTags: s.matchTags,
    articleSlugs: s.articleSlugs,
    articleCount: s.articles.length,
  }))
  return NextResponse.json({ layout: file.layout, series })
}

/**
 * POST /api/category — create a series
 * JSON: { title, articleSlugs? }
 * or multipart: title, articleSlugs (JSON string), optional file
 */
export async function POST(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  const contentType = req.headers.get('content-type') || ''

  try {
    let title = ''
    let articleSlugs: string[] = []
    let coverImage: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      title = String(form.get('title') || '')
      const rawSlugs = form.get('articleSlugs')
      if (typeof rawSlugs === 'string' && rawSlugs.trim()) {
        try {
          const parsed = JSON.parse(rawSlugs) as unknown
          articleSlugs = Array.isArray(parsed) ? parsed.map(String) : []
        } catch {
          articleSlugs = []
        }
      }
      const file = form.get('file')
      if (file instanceof File && file.size > 0) {
        coverImage = await coverFromFormFile(file, uniqueSlugHint(title))
      }
    } else {
      const body = (await req.json()) as {
        title?: string
        articleSlugs?: string[]
        coverImage?: string
      }
      title = typeof body.title === 'string' ? body.title : ''
      articleSlugs = Array.isArray(body.articleSlugs)
        ? body.articleSlugs.map(String)
        : []
      if (typeof body.coverImage === 'string' && body.coverImage.trim()) {
        coverImage = body.coverImage.trim()
      }
    }

    if (!title.trim()) {
      return NextResponse.json({ error: '제목이 필요합니다' }, { status: 400 })
    }

    const series = createSeries({ title, articleSlugs, coverImage })
    return NextResponse.json({ series }, { status: 201 })
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status })
  }
}

function uniqueSlugHint(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'series'
  )
}

/**
 * PUT /api/category
 * Body: { layout?: SeriesListLayout, order?: string[] }
 */
export async function PUT(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  let body: { layout?: SeriesListLayout; order?: string[] }
  try {
    body = (await req.json()) as { layout?: SeriesListLayout; order?: string[] }
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  try {
    const cur = readSeriesFile()
    const layout = body.layout
      ? sanitizeSeriesListLayout(body.layout)
      : cur.layout
    const series = Array.isArray(body.order)
      ? reorderSeriesBySlugs(cur.series, body.order)
      : cur.series
    const next = writeSeriesFile({ layout, series })
    return NextResponse.json({ layout: next.layout, series: next.series })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
