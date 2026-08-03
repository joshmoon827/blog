/** Practical category taxonomy for the newrite editor (Tistory-style UI). */

export type BlogCategory = {
  id: string
  label: string
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  { id: '', label: '카테고리' },
  { id: 'articles', label: 'Articles' },
  { id: 'series', label: 'Series' },
  { id: 'notes', label: 'Notes' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'ai', label: 'AI' },
  { id: 'tools', label: 'Tools' },
]

export function categoryLabel(id: string | undefined | null): string {
  if (!id) return '카테고리'
  return BLOG_CATEGORIES.find((c) => c.id === id)?.label ?? id
}
