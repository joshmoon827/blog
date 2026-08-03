/** How an article body was authored — drives read-view styles. */

export const ARTICLE_FORMATS = ['default', 'tistory', 'obsidian'] as const

export type ArticleFormat = (typeof ARTICLE_FORMATS)[number]

export function isArticleFormat(value: unknown): value is ArticleFormat {
  return (
    typeof value === 'string' &&
    (ARTICLE_FORMATS as readonly string[]).includes(value)
  )
}

/** Missing / unknown → `default` (legacy blog posts). */
export function resolveArticleFormat(
  value: unknown,
): ArticleFormat {
  if (isArticleFormat(value)) return value
  return 'default'
}

export function formatBodyClassName(format: ArticleFormat): string {
  return `article-format-${format}`
}
