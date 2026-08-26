/**
 * Lab-only Obsidian wiki/embed parser.
 * Production `sanitizeObsidianBody` uses `[^\]|#]+`, so filenames that start
 * with `[` (e.g. `![[[L01-01A]_….pdf]]`) never match and leak as raw text.
 * Do not import this from production routes.
 */

export type PdfToken = {
  type: 'pdf'
  filename: string
  alias?: string
}

export type WikiToken = {
  type: 'wikilink'
  target: string
  alias?: string
  slug: string | null
}

export type TextToken = {
  type: 'text'
  value: string
}

export type LabToken = PdfToken | WikiToken | TextToken

export type ArticleRef = {
  slug: string
  title: string
}

function findWikiClose(source: string, innerStart: number): number {
  let depth = 0
  let i = innerStart
  while (i < source.length - 1) {
    const ch = source[i]
    if (ch === '[') {
      depth += 1
      i += 1
      continue
    }
    if (ch === ']' && source[i + 1] === ']' && depth === 0) {
      return i
    }
    if (ch === ']') {
      if (depth > 0) depth -= 1
      i += 1
      continue
    }
    i += 1
  }
  return -1
}

function splitTarget(inner: string): { target: string; alias?: string } {
  const pipe = inner.indexOf('|')
  const raw = pipe === -1 ? inner : inner.slice(0, pipe)
  const alias = pipe === -1 ? undefined : inner.slice(pipe + 1).trim() || undefined
  const hash = raw.indexOf('#')
  const target = (hash === -1 ? raw : raw.slice(0, hash)).trim()
  return { target, alias }
}

export function slugifyWikiTarget(target: string): string {
  const base = target
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base
}

export function resolveWikiSlug(target: string, articles: ArticleRef[]): string | null {
  const trimmed = target.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  const slugified = slugifyWikiTarget(trimmed)
  const bySlug = articles.find((a) => a.slug.toLowerCase() === lower)
  if (bySlug) return bySlug.slug
  const bySlugified = slugified
    ? articles.find((a) => a.slug.toLowerCase() === slugified)
    : undefined
  if (bySlugified) return bySlugified.slug
  const byTitle = articles.find((a) => a.title.trim().toLowerCase() === lower)
  return byTitle?.slug ?? null
}

function isPdfFilename(name: string): boolean {
  return /\.pdf$/i.test(name.trim())
}

export function parseObsidianLab(body: string, articles: ArticleRef[]): LabToken[] {
  const tokens: LabToken[] = []
  let i = 0
  let textStart = 0

  const flushText = (end: number) => {
    if (end > textStart) {
      tokens.push({ type: 'text', value: body.slice(textStart, end) })
    }
  }

  while (i < body.length) {
    const embed = body.startsWith('![[', i)
    const wiki = !embed && body.startsWith('[[', i)
    if (!embed && !wiki) {
      i += 1
      continue
    }
    const innerStart = i + (embed ? 3 : 2)
    const close = findWikiClose(body, innerStart)
    if (close === -1) {
      i += 1
      continue
    }
    flushText(i)
    const inner = body.slice(innerStart, close)
    const { target, alias } = splitTarget(inner)
    if (embed && isPdfFilename(target)) {
      tokens.push({ type: 'pdf', filename: target, alias })
    } else if (embed) {
      tokens.push({ type: 'text', value: `*[embedded: ${alias || target}]*` })
    } else {
      tokens.push({
        type: 'wikilink',
        target,
        alias,
        slug: resolveWikiSlug(target, articles),
      })
    }
    i = close + 2
    textStart = i
  }
  flushText(body.length)
  return tokens
}
