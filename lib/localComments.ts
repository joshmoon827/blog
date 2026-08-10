import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { DbComment } from '@/lib/supabase/client'

const DB_PATH = path.join(process.cwd(), 'data', 'comments.local.json')

function readAll(): DbComment[] {
  if (!existsSync(DB_PATH)) return []
  try {
    const raw = JSON.parse(readFileSync(DB_PATH, 'utf8')) as unknown
    return Array.isArray(raw) ? (raw as DbComment[]) : []
  } catch {
    return []
  }
}

function writeAll(rows: DbComment[]) {
  writeFileSync(DB_PATH, JSON.stringify(rows, null, 2) + '\n', 'utf8')
}

export function listLocalComments(articleSlug: string): DbComment[] {
  return readAll()
    .filter((c) => c.article_slug === articleSlug)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function createLocalComment(input: {
  article_slug: string
  parent_id: string | null
  author: string
  body: string
}): DbComment {
  const author = input.author.trim().slice(0, 40)
  const body = input.body.trim().slice(0, 4000)
  if (!author || !body) {
    throw Object.assign(new Error('이름과 내용을 입력하세요.'), { status: 400 })
  }

  const all = readAll()
  if (input.parent_id) {
    const parent = all.find((c) => c.id === input.parent_id)
    if (!parent || parent.article_slug !== input.article_slug) {
      throw Object.assign(new Error('답글 대상을 찾을 수 없습니다.'), { status: 400 })
    }
    if (parent.parent_id) {
      throw Object.assign(new Error('답글에는 다시 답글을 달 수 없습니다.'), {
        status: 400,
      })
    }
  }

  const row: DbComment = {
    id: randomUUID(),
    article_slug: input.article_slug,
    parent_id: input.parent_id,
    author,
    body,
    upvotes: 0,
    downvotes: 0,
    score_floor: 0,
    created_at: new Date().toISOString(),
  }
  all.push(row)
  writeAll(all)
  return row
}

export function voteLocalComment(
  id: string,
  direction: 'up' | 'down',
  voter: string,
): DbComment {
  const all = readAll()
  const idx = all.findIndex((c) => c.id === id)
  if (idx < 0) {
    throw Object.assign(new Error('comment not found'), { status: 404 })
  }
  const c = { ...all[idx] }
  const name = voter.trim()
  const isAuthor = Boolean(name && name === c.author)

  if (direction === 'up') {
    const newScore = c.upvotes + 1
    c.upvotes = newScore
    if (!isAuthor) c.score_floor = newScore
  } else {
    if (!isAuthor) {
      throw Object.assign(new Error('only the author can lower'), { status: 400 })
    }
    if (c.upvotes <= (c.score_floor ?? 0)) {
      throw Object.assign(new Error('cannot lower below floor'), { status: 400 })
    }
    c.upvotes = Math.max(0, c.upvotes - 1)
  }

  all[idx] = c
  writeAll(all)
  return c
}
