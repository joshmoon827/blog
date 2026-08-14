import { NextRequest, NextResponse } from 'next/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { unauthorizedIfGuest } from '@/lib/requireAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { getSeriesDetail } from '@/lib/seriesItems'
import { readSeriesBySlug, updateSeries } from '@/lib/series.server'
import {
  MAX_IMAGE_BYTES,
  validateImageFile,
} from '@/lib/githubImageUpload'


type Ctx = { params: Promise<{ slug: string }> }

/** GET /api/category/[slug] */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params
  const detail = getSeriesDetail(slug)
  if (!detail) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 })
  }
  return NextResponse.json({
    series: {
      slug: detail.slug,
      title: detail.title,
      description: detail.description,
      coverImage: detail.coverImage,
      matchTags: detail.matchTags,
      articleSlugs: detail.articleSlugs,
    },
    articles: detail.articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      description: a.description,
      image: a.image,
      tags: a.tags,
    })),
  })
}

/**
 * PATCH /api/category/[slug]
 * JSON: { coverImage?, title?, description? }
 * or multipart: field `file` (saved under public/images/category/)
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  const { slug } = await ctx.params
  if (!readSeriesBySlug(slug)) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 })
  }

  const contentType = req.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Expected multipart field "file"' },
          { status: 400 },
        )
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit` },
          { status: 413 },
        )
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      const mime = file.type || 'application/octet-stream'
      const validated = validateImageFile(mime, bytes.length)
      if (!validated.ok) {
        return NextResponse.json(
          { error: validated.error },
          { status: validated.status },
        )
      }

      const ext =
        mime === 'image/png'
          ? 'png'
          : mime === 'image/webp'
            ? 'webp'
            : mime === 'image/gif'
              ? 'gif'
              : 'jpg'
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${slug}-${stamp}.${ext}`
      const dir = path.join(process.cwd(), 'public', 'images', 'category')
      mkdirSync(dir, { recursive: true })
      writeFileSync(path.join(dir, filename), bytes)
      const coverImage = `/images/category/${filename}`
      const updated = updateSeries(slug, { coverImage })
      return NextResponse.json({ series: updated })
    }

    const body = (await req.json()) as {
      coverImage?: string
      title?: string
      description?: string
      articleSlugs?: string[] | null
    }
    const patch: {
      coverImage?: string
      title?: string
      description?: string
      articleSlugs?: string[] | null
    } = {}
    if (typeof body.coverImage === 'string' && body.coverImage.trim()) {
      patch.coverImage = body.coverImage.trim()
    }
    if (typeof body.title === 'string') patch.title = body.title
    if (typeof body.description === 'string') patch.description = body.description
    if (Object.prototype.hasOwnProperty.call(body, 'articleSlugs')) {
      patch.articleSlugs = Array.isArray(body.articleSlugs)
        ? body.articleSlugs
        : null
    }

    const updated = updateSeries(slug, patch)
    return NextResponse.json({ series: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
