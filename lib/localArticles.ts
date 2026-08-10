import fs from 'fs'
import path from 'path'
import type { ArticleFormat } from '@/data/articleFormats'

export interface ArticleData {
  slug: string
  title: string
  description: string
  /** Obsidian frontmatter `created` (YYYY-MM-DD). Phase-1 field. */
  created?: string
  /** Obsidian frontmatter `tags` (shared with home filters). */
  tags?: string[]
  /** Blog category id from newrite / Tistory-style picker. */
  category?: string
  /**
   * Authoring / read-render mode.
   * Missing → treated as `default` (legacy posts).
   * `/newrite` → `tistory`; Obsidian import → `obsidian`.
   */
  format?: ArticleFormat
  image: string
  body: string
  /** Absolute or vault-relative source path when imported from Obsidian */
  sourcePath?: string
  /** True when saved via newrite 임시저장 (not published). */
  draft?: boolean
  /** 보관(북마크/고정) 상태. 독립적인 보관 글 목록을 위해 사용(v2 기능). */
  archived?: boolean
  /** Soft-deleted — hidden from listings; trash UI later. */
  trashed?: boolean
  /** ISO timestamp when moved to trash. */
  trashedAt?: string
}

const DB_PATH = path.join(process.cwd(), 'data', 'articles.local.json')

export function readAll(): ArticleData[] {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(raw)
}

export function readOne(slug: string): ArticleData | undefined {
  return readAll().find((a) => a.slug === slug)
}

export function writeAll(articles: ArticleData[]): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(articles, null, 2), 'utf-8')
}

export function updateOne(slug: string, patch: Partial<ArticleData>): ArticleData | null {
  const all = readAll()
  const idx = all.findIndex((a) => a.slug === slug)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...patch, slug }
  writeAll(all)
  return all[idx]
}

export function createOne(article: ArticleData): ArticleData {
  const all = readAll()
  if (all.some((a) => a.slug === article.slug)) {
    throw Object.assign(new Error(`Slug already exists: ${article.slug}`), { status: 409 })
  }
  all.unshift(article)
  writeAll(all)
  return article
}

/** Hard-delete (permanent). Prefer `trashOne` for admin UI. */
export function deleteOne(slug: string): boolean {
  const all = readAll()
  const next = all.filter((a) => a.slug !== slug)
  if (next.length === all.length) return false
  writeAll(next)
  return true
}

/** Soft-delete → trash. Idempotent if already trashed. */
export function trashOne(slug: string): ArticleData | null {
  const all = readAll()
  const idx = all.findIndex((a) => a.slug === slug)
  if (idx === -1) return null
  const prev = all[idx]
  if (prev.trashed) return prev
  const next: ArticleData = {
    ...prev,
    trashed: true,
    trashedAt: new Date().toISOString(),
  }
  all[idx] = next
  writeAll(all)
  return next
}

export function listTrashed(): ArticleData[] {
  return readAll()
    .filter((a) => a.trashed)
    .sort((a, b) => (b.trashedAt || '').localeCompare(a.trashedAt || ''))
}

export function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `article-${Date.now().toString(36)}`
}
