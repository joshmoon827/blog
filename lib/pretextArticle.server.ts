import { readAll, type ArticleData } from '@/lib/localArticles'

export const PRETEXT_MIN_ARTICLE_CHARACTERS = 1200
const MAX_LAYOUT_CHARACTERS = 8000

export type PretextFeatureArticle = {
  articleTitle: string
  articleText: string
  highlightPhrases: string[]
  articleHref: string
  articleDate: string
  articleCharacterCount: number
  coverImage: string
  minimumCharacterCount: number
}

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

function articleBodyToPlainText(body: string) {
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

function flattenPhrase(value: string) {
  return value
    .replace(/[*_~`#\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cuePhrases(body: string): string[] {
  const decoded = decodeCommonEntities(body)
  const found: string[] = []
  for (const match of decoded.matchAll(/\*\*([^*]{2,72})\*\*/g)) {
    found.push(flattenPhrase(match[1] ?? ''))
  }
  for (const match of decoded.matchAll(/__([^_]{2,72})__/g)) {
    found.push(flattenPhrase(match[1] ?? ''))
  }
  for (const match of decoded.matchAll(/^#{1,3}\s+(.+)$/gm)) {
    found.push(flattenPhrase(match[1] ?? ''))
  }
  return found.filter((phrase) => phrase.replace(/\s/g, '').length >= 2)
}

function splitSentences(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(
      new Intl.Segmenter('ko', { granularity: 'sentence' }).segment(text),
      (part) => part.segment.replace(/\s+/g, ' ').trim(),
    ).filter(Boolean)
  }
  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Important sentences (not isolated words) to highlighter-mark in Pretext. */
export function extractHighlightPhrases(plainText: string, body: string): string[] {
  const cues = cuePhrases(body)
  const sentences = splitSentences(plainText)
  const scored = sentences.map((sentence) => {
    const compact = sentence.replace(/\s/g, '')
    if (compact.length < 14 || compact.length > 200) {
      return { sentence, score: -1 }
    }
    let score = 1
    for (const cue of cues) {
      if (sentence.includes(cue) || cue.length >= 8 && sentence.includes(cue.slice(0, 12))) {
        score += 4
      }
    }
    if (/다\.|입니다|합니다|한다|이다|습니다|요\./.test(sentence)) score += 1
    return { sentence, score }
  })

  const ranked = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length)

  const picked: string[] = []
  const seen = new Set<string>()
  for (const item of ranked) {
    const key = item.sentence.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(item.sentence)
    if (picked.length >= 7) break
  }
  return picked.flatMap((sentence) => splitSentenceIntoStrokes(sentence, 4))
}

function splitSentenceIntoStrokes(sentence: string, targetParts = 4): string[] {
  const chars = Array.from(sentence.replace(/\s+/g, ' ').trim())
  if (chars.length < 16) return [chars.join('')]
  const parts = Math.min(targetParts, Math.max(2, Math.round(chars.length / 18)))
  const gap = Math.max(1, Math.round(chars.length * 0.06))
  const usable = Math.max(parts, chars.length - gap * (parts - 1))
  const chunk = Math.floor(usable / parts)
  const strokes: string[] = []
  let index = 0
  for (let part = 0; part < parts; part += 1) {
    const take = part === parts - 1 ? chars.length - index : chunk
    const slice = chars.slice(index, index + take).join('').trim()
    if (slice.replace(/\s/g, '').length >= 2) strokes.push(slice)
    index += take + gap
    if (index >= chars.length) break
  }
  return strokes
}

function publishedArticle(article: ArticleData) {
  return (
    !article.draft &&
    !article.archived &&
    !article.trashed &&
    Boolean(article.image) &&
    Boolean(article.body.trim())
  )
}

export function getPretextFeatureArticle(): PretextFeatureArticle {
  const candidates = readAll()
    .filter(publishedArticle)
    .map((article) => {
      const text = articleBodyToPlainText(article.body)
      return {
        article,
        text,
        characterCount: text.replace(/\s/g, '').length,
      }
    })
    .filter((candidate) => candidate.characterCount > 0)
    .sort((a, b) =>
      (b.article.created || '').localeCompare(a.article.created || ''),
    )

  const selected =
    candidates.find(
      (candidate) =>
        candidate.characterCount >= PRETEXT_MIN_ARTICLE_CHARACTERS,
    ) ??
    candidates.sort((a, b) => b.characterCount - a.characterCount)[0] ??
    null
  const article = selected?.article

  return {
    articleTitle: article?.title || 'Dynamic Editorial Systems',
    articleText: selected
      ? Array.from(selected.text).slice(0, MAX_LAYOUT_CHARACTERS).join('')
      : '충분한 길이의 게시된 아티클이 없습니다.',
    highlightPhrases: article && selected
      ? extractHighlightPhrases(selected.text, article.body)
      : [],
    articleHref: article
      ? `/articles/${encodeURIComponent(article.slug)}`
      : '/',
    articleDate: article?.created || '',
    articleCharacterCount: selected?.characterCount ?? 0,
    coverImage: article?.image || '/blog-logo.svg',
    minimumCharacterCount: PRETEXT_MIN_ARTICLE_CHARACTERS,
  }
}
