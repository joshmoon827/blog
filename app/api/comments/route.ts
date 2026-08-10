import { NextRequest, NextResponse } from 'next/server'
import { createComment, listComments, resolveCommentsBackend } from '@/lib/commentsStore'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim() || ''
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  if (!resolveCommentsBackend()) {
    return NextResponse.json(
      {
        error:
          '댓글 백엔드가 없습니다. 로컬은 data/comments.local.json으로 동작하고, 배포 환경은 Supabase URL·anon key가 필요합니다.',
        backend: null,
      },
      { status: 503 },
    )
  }

  try {
    const { comments, backend } = await listComments(slug)
    return NextResponse.json({ comments, backend })
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  let body: {
    articleSlug?: string
    parentId?: string | null
    author?: string
    body?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const articleSlug = body.articleSlug?.trim() || ''
  const author = body.author?.trim() || ''
  const text = body.body?.trim() || ''
  const parentId =
    typeof body.parentId === 'string' && body.parentId.trim()
      ? body.parentId.trim()
      : null

  if (!articleSlug) {
    return NextResponse.json({ error: 'articleSlug is required' }, { status: 400 })
  }
  if (!author || !text) {
    return NextResponse.json(
      { error: '이름과 내용을 입력하세요.' },
      { status: 400 },
    )
  }

  try {
    const { comment, backend } = await createComment({
      article_slug: articleSlug,
      parent_id: parentId,
      author,
      body: text,
    })
    return NextResponse.json({ comment, backend })
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status })
  }
}
