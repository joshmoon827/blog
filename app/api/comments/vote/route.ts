import { NextRequest, NextResponse } from 'next/server'
import { voteComment } from '@/lib/commentsStore'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: {
    id?: string
    direction?: 'up' | 'down'
    voter?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const id = body.id?.trim() || ''
  const direction = body.direction
  const voter = body.voter?.trim() || ''

  if (!id || (direction !== 'up' && direction !== 'down')) {
    return NextResponse.json(
      { error: 'id and direction (up|down) are required' },
      { status: 400 },
    )
  }

  try {
    const { comment, backend } = await voteComment(id, direction, voter)
    return NextResponse.json({ comment, backend })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    const message =
      raw.includes('only the author')
        ? '본인 댓글만 추천을 내릴 수 있습니다.'
        : raw.includes('cannot lower')
          ? '남이 올려 둔 추천 수는 내릴 수 없습니다.'
          : raw
    return NextResponse.json({ error: message }, { status })
  }
}
