import { coverImages, randomCoverPickerImage } from '@/data/covers'
import {
  isArticleFormat,
  type ArticleFormat,
} from '@/data/articleFormats'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createOne, readAll, slugifyTitle, type ArticleData } from '@/lib/localArticles'

const DEFAULT_COVER = coverImages[0]

export async function GET() {
  const articles = readAll()
  return NextResponse.json(articles)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ArticleData> & {
      draft?: boolean
    }
    const isDraft = body.draft === true
    const title = (body.title || '').trim() || (isDraft ? '제목 없음' : '')
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const requestedSlug = (body.slug || '').trim()
    const slug =
      requestedSlug ||
      (isDraft
        ? `draft-${Date.now().toString(36)}`
        : slugifyTitle(title))
    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter(Boolean)
      : []

    const category =
      typeof body.category === 'string' ? body.category.trim() : ''

    const format: ArticleFormat | undefined = isArticleFormat(body.format)
      ? body.format
      : undefined

    // Drafts always get a random stock palette image — never Gemini generate-cover.
    const image = isDraft
      ? randomCoverPickerImage()
      : (body.image || '').trim() || DEFAULT_COVER

    const article: ArticleData = {
      slug,
      title,
      description: (body.description || '').trim(),
      created: (body.created || '').trim() || undefined,
      tags,
      category: category || undefined,
      format,
      image,
      body: body.body || '',
      sourcePath: body.sourcePath,
      draft: isDraft || undefined,
    }

    const created = createOne(article)
    revalidateTag('articles', 'max')
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
