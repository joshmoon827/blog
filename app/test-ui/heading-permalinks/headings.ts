export type Heading = {
  level: 1 | 2 | 3
  text: string
  id: string
}

export function slugifyHeading(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base
}

export function extractHeadings(markdown: string): Heading[] {
  const used = new Map<string, number>()
  const out: Heading[] = []
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line)
    if (!match) continue
    const raw = match[1].length as 1 | 2 | 3
    // v8 fixture uses `#` for sections; lab permalinks are h2/h3.
    const level = (raw >= 3 ? 3 : 2) as 2 | 3
    const text = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
    let id = slugifyHeading(text) || 'section'
    const next = (used.get(id) || 0) + 1
    used.set(id, next)
    if (next > 1) id = `${id}-${next}`
    out.push({ level, text, id })
  }
  return out
}

export type BodyBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string; id: string }
  | { type: 'p'; text: string }

export function extractBlocks(markdown: string): BodyBlock[] {
  const used = new Map<string, number>()
  const blocks: BodyBlock[] = []
  let para: string[] = []

  const flushPara = () => {
    const text = para.join('\n').trim()
    para = []
    if (text) blocks.push({ type: 'p', text })
  }

  const uniqueId = (text: string) => {
    let id = slugifyHeading(text) || 'section'
    const next = (used.get(id) || 0) + 1
    used.set(id, next)
    if (next > 1) id = `${id}-${next}`
    return id
  }

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line)
    if (match) {
      flushPara()
      const raw = match[1].length as 1 | 2 | 3
      const level = (raw >= 3 ? 3 : 2) as 2 | 3
      const text = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
      blocks.push({ type: 'heading', level, text, id: uniqueId(text) })
      continue
    }
    para.push(line)
  }
  flushPara()
  return blocks
}
