/**
 * Parse Obsidian-style ```embed fences (YAML-ish key: "value" lines).
 */

export type EmbedCardData = {
  title: string
  image: string
  description: string
  url: string
  favicon: string
  /** Image box height as % of width (padding-bottom style), e.g. "67.5". */
  aspectRatio: string
}

const EMBED_KEYS = [
  'title',
  'image',
  'description',
  'url',
  'favicon',
  'aspectRatio',
] as const

function unquote(raw: string): string {
  const s = raw.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1)
  }
  return s
}

/** Parse the body of a ```embed fence into card fields. */
export function parseEmbedFence(source: string): EmbedCardData | null {
  const data: Partial<EmbedCardData> = {}
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([A-Za-z][\w]*)\s*:\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    const value = unquote(m[2] ?? '')
    if ((EMBED_KEYS as readonly string[]).includes(key)) {
      data[key as keyof EmbedCardData] = value
    }
  }
  const url = (data.url || '').trim()
  if (!url) return null
  return {
    title: (data.title || '').trim(),
    image: (data.image || '').trim(),
    description: (data.description || '').trim(),
    url,
    favicon: (data.favicon || '').trim(),
    aspectRatio: (data.aspectRatio || '').trim(),
  }
}

export function embedHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
