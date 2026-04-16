import fs from 'fs'
import path from 'path'

export interface ArticleData {
  slug: string
  title: string
  description: string
  image: string
  body: string
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
