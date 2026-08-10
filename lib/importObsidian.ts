import fs from 'fs'
import path from 'path'
import {
  normalizeCreated,
  parseMarkdownWithFrontmatter,
} from '@/lib/parseFrontmatter'
import { coverImages } from '@/data/covers'
import {
  createOne,
  readOne,
  slugifyTitle,
  updateOne,
  type ArticleData,
} from '@/lib/localArticles'

const DEFAULT_COVER = coverImages[0]

export type ImportObsidianResult = {
  article: ArticleData
  action: 'created' | 'updated'
  sourcePath: string
}

function titleFromFilename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).trim()
}

/** Strip Obsidian wiki-links / embeds lightly for web body (no image upload). */
export function sanitizeObsidianBody(body: string): string {
  return body
    .replace(/!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_m, file, alias) => {
      const label = alias || String(file).replace(/\.[^.]+$/, '')
      return `*[embedded: ${label}]*`
    })
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
      return alias || String(target)
    })
    .replace(/^>\s*\[!(\w+)\][^\n]*\n?/gm, (_m, kind) => `> **${kind}**\n`)
}

/**
 * Like sanitizeObsidianBody, but uploads image embeds to GitHub and rewrites
 * them to `/api/images/...` markdown. Use for vault import (UI / CLI).
 */
export async function sanitizeObsidianBodyWithImages(
  body: string,
  noteAbsPath: string,
  vaultRoot: string,
): Promise<{ body: string; uploaded: number; errors: string[] }> {
  const { rewriteObsidianImagesInBody } = await import('@/lib/obsidianImages')
  const result = await rewriteObsidianImagesInBody(body, noteAbsPath, vaultRoot)
  return {
    body: result.body,
    uploaded: result.uploaded,
    errors: result.errors,
  }
}

export function markdownFileToArticle(
  filePath: string,
  source: string,
  options?: { slug?: string; image?: string },
): ArticleData {
  const { frontmatter, body } = parseMarkdownWithFrontmatter(source)
  const title =
    frontmatter.title?.trim() || titleFromFilename(filePath)
  const slug = options?.slug || slugifyTitle(title)
  const description = (frontmatter.description || '').trim()
  const created = normalizeCreated(frontmatter.created)
  const tags = frontmatter.tags || []

  return {
    slug,
    title,
    description,
    created,
    tags,
    format: 'obsidian',
    image: options?.image || DEFAULT_COVER,
    body: sanitizeObsidianBody(body),
    sourcePath: filePath,
  }
}

export function importObsidianMarkdownFile(
  filePath: string,
  options?: { force?: boolean; slug?: string; image?: string },
): ImportObsidianResult {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    throw Object.assign(new Error(`File not found: ${abs}`), { status: 404 })
  }
  if (!abs.endsWith('.md')) {
    throw Object.assign(new Error('Only .md files are supported'), { status: 400 })
  }

  const source = fs.readFileSync(abs, 'utf-8')
  const article = markdownFileToArticle(abs, source, {
    slug: options?.slug,
    image: options?.image,
  })

  const existing = readOne(article.slug)
  if (existing && !options?.force) {
    throw Object.assign(
      new Error(
        `Slug already exists: ${article.slug}. Re-run with --force to overwrite.`,
      ),
      { status: 409 },
    )
  }

  if (existing && options?.force) {
    const updated = updateOne(article.slug, article)
    if (!updated) throw new Error('Update failed')
    return { article: updated, action: 'updated', sourcePath: abs }
  }

  const created = createOne(article)
  return { article: created, action: 'created', sourcePath: abs }
}
