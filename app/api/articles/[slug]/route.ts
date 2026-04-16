import { NextRequest, NextResponse } from 'next/server'
import { readOne, updateOne } from '@/lib/localArticles'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const article = readOne(slug)
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(article)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const body = await req.json()
  const updated = updateOne(slug, body)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}
