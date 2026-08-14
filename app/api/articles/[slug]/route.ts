import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { isArticleFormat } from '@/data/articleFormats'
import {
  deleteOne,
  readOne,
  trashOne,
  updateOne,
  type ArticleData,
} from '@/lib/localArticles'
import { normalizeTags } from '@/lib/parseFrontmatter'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const article = readOne(slug)
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(article)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const body = (await req.json()) as Partial<ArticleData>
  if (body.tags !== undefined) {
    body.tags = normalizeTags(body.tags)
  }
  if (body.format !== undefined && !isArticleFormat(body.format)) {
    delete body.format
  }
  if (body.draft === false) {
    body.draft = undefined
  } else if (body.draft !== true) {
    delete body.draft
  }
  // 보관 토글도 draft와 동일한 정책: 값이 없으면 필드 자체를 제거한다.
  if (body.archived === false) {
    body.archived = undefined
  } else if (body.archived !== true) {
    delete body.archived
  }
  if (body.trashed === false) {
    body.trashed = undefined
    body.trashedAt = undefined
  } else if (body.trashed !== true) {
    delete body.trashed
    delete body.trashedAt
  }
  const updated = updateOne(slug, body)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidateTag('articles', 'max')
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const hard = req.nextUrl.searchParams.get('hard') === '1'
  if (hard) {
    const removed = deleteOne(slug)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidateTag('articles', 'max')
    return NextResponse.json({ ok: true, slug, hard: true })
  }
  const trashed = trashOne(slug)
  if (!trashed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidateTag('articles', 'max')
  return NextResponse.json({ ok: true, slug, trashed: true })
}
