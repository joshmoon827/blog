import type { Article } from '@/data/articles'
import { readAll, type ArticleData } from '@/lib/localArticles'

function toListed(item: ArticleData): Article {
  return {
    slug: item.slug,
    title: item.title,
    description: item.description,
    image: item.image,
    title_en: item.title_en,
    description_en: item.description_en,
    tags: item.tags || [],
    related: [],
    draft: item.draft || undefined,
    archived: item.archived || undefined,
    trashed: item.trashed || undefined,
  }
}

export type ListedArticlesOptions = {
  /** When true, include 임시저장 drafts. Default false (home never shows drafts). */
  includeDrafts?: boolean
  /** When true, also include 보관(archived) articles. Default false. */
  includeArchived?: boolean
  /** When true, include trashed articles. Default false. */
  includeTrashed?: boolean
}

/** Listed articles from the local content store. */
export function getListedArticles(opts?: ListedArticlesOptions): Article[] {
  const includeDrafts = opts?.includeDrafts ?? false
  const includeArchived = opts?.includeArchived ?? false
  const includeTrashed = opts?.includeTrashed ?? false
  return readAll()
    .filter(
      (item) =>
        (includeDrafts || !item.draft) &&
        (includeArchived || !item.archived) &&
        (includeTrashed || !item.trashed),
    )
    .map(toListed)
}

/** Only 임시저장 drafts, newest first (readAll already unshifts creates). */
export function getDraftArticles(): Article[] {
  return readAll()
    .filter((item) => item.draft && !item.trashed)
    .map(toListed)
}

/** Only 보관(archived) articles, newest first. */
export function getArchivedArticles(): Article[] {
  return readAll()
    .filter((item) => item.archived && !item.trashed && !item.draft)
    .map(toListed)
}

/** Soft-deleted articles (trash). */
export function getTrashedArticles(): Article[] {
  return readAll()
    .filter((item) => item.trashed)
    .sort((a, b) => (b.trashedAt || '').localeCompare(a.trashedAt || ''))
    .map(toListed)
}

/** Count of 보관(archived) articles. */
export function countArchivedArticles(): number {
  return readAll().filter((item) => item.archived && !item.trashed && !item.draft)
    .length
}

export function countDraftArticles(): number {
  return readAll().filter((item) => item.draft && !item.trashed).length
}

export function countTrashedArticles(): number {
  return readAll().filter((item) => item.trashed).length
}
