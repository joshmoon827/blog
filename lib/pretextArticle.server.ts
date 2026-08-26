import { readAll, type ArticleData } from '@/lib/localArticles'
import { articleBodyToPlainText } from '@/lib/articlePlainText'

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
      '분포를 맞춤',
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
