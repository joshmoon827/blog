function decodeCommonEntities(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number.parseInt(code, 10)
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ''
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const point = Number.parseInt(code, 16)
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ''
    })
}

export function articleBodyToPlainText(body: string) {
  const withEmbedSummaries = body.replace(
    /```embed\s*\n([\s\S]*?)```/gi,
    (_, block: string) => {
      const fields = Array.from(
        block.matchAll(/^(?:title|description):\s*"([^"]+)"/gim),
        (match) => match[1]?.trim(),
      ).filter(Boolean)
      return fields.join('. ')
    },
  )

  const text = decodeCommonEntities(withEmbedSummaries)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6]|figure|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[\[[^\]]+\]\]/g, ' ')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/%%[\s\S]*?%%/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/\\(?:hat|mathcal|text)\{([^{}]+)\}/g, '$1')
    .replace(/\\mid/g, ' | ')
    .replace(/\\(?:big|left|right)/g, '')
    .replace(/[*_~`]/g, '')
    .replace(/[$\\{}]/g, '')
    .replace(/\|/g, ' ')
    .replace(/\r/g, '')

  return text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !/^[-:\s]+$/.test(line))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getArticleBodyExcerpt(body: string, limit = 100) {
  const plain = articleBodyToPlainText(body)
  if (!plain) return ''
  const chars = Array.from(plain)
  if (chars.length <= limit) return plain
  return `${chars.slice(0, limit).join('')}…`
}
