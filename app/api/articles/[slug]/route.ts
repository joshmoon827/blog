import { NextRequest, NextResponse } from 'next/server'
import { isArticleFormat } from '@/data/articleFormats'
import { readOne, updateOne, type ArticleData } from '@/lib/localArticles'
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
  const updated = updateOne(slug, body)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}
