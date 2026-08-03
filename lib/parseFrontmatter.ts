/**
 * Minimal YAML frontmatter parser for Obsidian notes.
 * Fields: created, description, title, tags.
 * Other keys are kept in `raw` for gradual rollout.
 */

export type ParsedFrontmatter = {
  created?: string
  description?: string
  title?: string
  tags: string[]
  /** Remaining keys for future UI fields */
  raw: Record<string, unknown>
}

/** Normalize Obsidian/YAML tag values into a clean string[]. */
export function normalizeTags(value: unknown): string[] {
  if (value == null || value === '') return []

  const pushUnique = (list: string[], raw: string) => {
    const t = raw
      .trim()
      .replace(/^#/, '')
      .replace(/^['"]|['"]$/g, '')
      .trim()
    if (t && !list.includes(t)) list.push(t)
  }

  if (Array.isArray(value)) {
    const out: string[] = []
    for (const item of value) {
      if (typeof item === 'string') pushUnique(out, item)
      else if (item != null) pushUnique(out, String(item))
    }
    return out
  }

  if (typeof value === 'string') {
    const t = value.trim()
    if (!t) return []
    // Flow-style: [a, b] or ["a", "b"]
    if (t.startsWith('[') && t.endsWith(']')) {
      const inner = t.slice(1, -1).trim()
      if (!inner) return []
      const out: string[] = []
      for (const part of inner.split(',')) pushUnique(out, part)
      return out
    }
    const out: string[] = []
    for (const part of t.split(/[,，、]/)) pushUnique(out, part)
    return out
  }

  return []
}

/** Parse comma-separated tag input from the article metadata form. */
export function parseTagsInput(text: string): string[] {
  return normalizeTags(text)
}

export function formatTagsInput(tags: string[] | undefined): string {
  return (tags || []).join(', ')
}

export type ParsedMarkdown = {
  frontmatter: ParsedFrontmatter
  body: string
}

function stripQuotes(value: string): string {
  const t = value.trim()
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1)
  }
  return t
}

function parseScalar(value: string): unknown {
  const t = value.trim()
  if (!t || t === 'null' || t === '~') return null
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  return stripQuotes(t)
}

/** Parse a simple YAML block (scalars + one-level lists). */
export function parseYamlBlock(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = yaml.replace(/\r\n/g, '\n').split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trimStart().startsWith('#')) {
      i++
      continue
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) {
      i++
      continue
    }

    const key = match[1]
    const rest = match[2]

    if (rest === '' || rest === '|' || rest === '>') {
      // list or empty / multiline — collect indented list items
      const items: string[] = []
      let j = i + 1
      while (j < lines.length) {
        const next = lines[j]
        if (/^\s+-\s+/.test(next)) {
          items.push(stripQuotes(next.replace(/^\s+-\s+/, '')))
          j++
          continue
        }
        if (/^\s+\S/.test(next) && rest === '|') {
          // folded block ignored for phase 1
          j++
          continue
        }
        break
      }
      result[key] = items.length ? items : rest === '' ? '' : rest
      i = j
      continue
    }

    result[key] = parseScalar(rest)
    i++
  }

  return result
}

export function parseMarkdownWithFrontmatter(source: string): ParsedMarkdown {
  const text = source.replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) {
    return {
      frontmatter: { tags: [], raw: {} },
      body: text.trimStart(),
    }
  }

  const end = text.indexOf('\n---', 3)
  if (end === -1) {
    return {
      frontmatter: { tags: [], raw: {} },
      body: text.trimStart(),
    }
  }

  const yaml = text.slice(4, end).trim()
  const body = text.slice(end + 4).replace(/^\n/, '')
  const raw = parseYamlBlock(yaml)

  const created =
    typeof raw.created === 'string'
      ? raw.created
      : typeof raw.date === 'string'
        ? raw.date
        : undefined

  const description =
    typeof raw.description === 'string'
      ? raw.description
      : typeof raw.summary === 'string'
        ? raw.summary
        : undefined

  const title = typeof raw.title === 'string' ? raw.title : undefined

  const tags = normalizeTags(
    raw.tags !== undefined ? raw.tags : raw.tag !== undefined ? raw.tag : [],
  )

  return {
    frontmatter: { created, description, title, tags, raw },
    body: body.trimStart(),
  }
}

/** Normalize Obsidian date to YYYY-MM-DD when possible. */
export function normalizeCreated(value?: string): string | undefined {
  if (!value) return undefined
  const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : value.trim()
}
