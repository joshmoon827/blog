import type { Article } from '@/data/articles'
import { readAll, type ArticleData } from '@/lib/localArticles'

function toListed(item: ArticleData): Article {
  return {
    slug: item.slug,
    title: item.title,
    description: item.description,
    image: item.image,
    tags: item.tags || [],
    related: [],
    draft: item.draft || undefined,
  }
}

export type ListedArticlesOptions = {
  /** When false, omit 임시저장 drafts. Default true. */
  includeDrafts?: boolean
}

/** Listed articles from the local content store. */
export function getListedArticles(opts?: ListedArticlesOptions): Article[] {
  const includeDrafts = opts?.includeDrafts ?? true
  return readAll()
    .filter((item) => includeDrafts || !item.draft)
    .map(toListed)
}

/** Only 임시저장 drafts, newest first (readAll already unshifts creates). */
export function getDraftArticles(): Article[] {
  return readAll().filter((item) => item.draft).map(toListed)
}

export function countDraftArticles(): number {
  return readAll().filter((item) => item.draft).length
}
