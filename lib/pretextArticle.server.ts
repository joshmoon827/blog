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

function sliceBlock(text: string, startNeedle: string, endNeedle: string) {
  const lower = text.toLowerCase()
  const start = lower.indexOf(startNeedle.toLowerCase())
  const end = lower.indexOf(endNeedle.toLowerCase(), start >= 0 ? start : 0)
  if (start < 0 || end < start) return null
  return text.slice(start, end + endNeedle.length).trim()
}

/** Continuous highlighter over each requested passage. */
export function extractHighlightPhrases(plainText: string, _body: string): string[] {
  const text = plainText.replace(/\s+/g, ' ').trim()
  return [
    sliceBlock(
      text,
      '월드모델과 AGI · Judea Pear',
      '상상(imagination) 하며 시뮬레이션',
    ),
    sliceBlock(
      text,
      '인코더가 뽑은 zt가 dynamics prior와 정렬되도록 유도',
      '손실 설계가 개선됨',
    ),
  ].filter((phrase): phrase is string => Boolean(phrase))
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
