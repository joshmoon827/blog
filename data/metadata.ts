/**
 * Obsidian vault frontmatter warehouse (okestro/_System/role/Frontmatter.md 기준).
 * tags · related 를 웹 아티클 메타데이터와 공유한다.
 */
export interface VaultNoteMetadata {
  created?: string
  updated?: string
  tags: string[]
  related?: string[]
  title?: string
  type?: string
  description?: string
}

export function countArticlesByTag(
  tag: string,
  items: ReadonlyArray<{ tags: string[] }>,
): number {
  return items.filter((item) => item.tags.includes(tag)).length
}

/** Collect unique tags from listed articles, sorted alphabetically. */
export function collectTagsFromArticles(items: ReadonlyArray<{ tags: string[] }>): string[] {
  const tags = new Set<string>()
  for (const item of items) {
    for (const tag of item.tags) {
      if (tag) tags.add(tag)
    }
  }
  // Fixed locale so SSR (Node) and client (browser ko/en) produce the same order.
  return [...tags].sort((a, b) => a.localeCompare(b, 'en'))
}
