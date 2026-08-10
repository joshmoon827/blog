/** Ephemeral draft snapshot for `/newrite/preview` (new-tab 크게 보기).
 *  Uses localStorage so a newly opened tab can read the payload
 *  (sessionStorage is not shared across tabs).
 */

import type { ArticleFormat } from '@/data/articleFormats'
import { resolveArticleFormat } from '@/data/articleFormats'

export const NEWRITE_PREVIEW_STORAGE_KEY = 'newrite-preview-v1'

export type NewritePreviewPayload = {
  title: string
  body: string
  tagsText: string
  category: string
  /** Authoring format — defaults to `tistory` for older payloads. */
  format?: ArticleFormat
  savedAt: number
}

export function writeNewritePreview(
  payload: Omit<NewritePreviewPayload, 'savedAt'>,
): void {
  const data: NewritePreviewPayload = {
    ...payload,
    format: resolveArticleFormat(payload.format ?? 'tistory'),
    savedAt: Date.now(),
  }
  localStorage.setItem(NEWRITE_PREVIEW_STORAGE_KEY, JSON.stringify(data))
}

export function readNewritePreview(): NewritePreviewPayload | null {
  try {
    const raw = localStorage.getItem(NEWRITE_PREVIEW_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as NewritePreviewPayload
    if (!parsed || typeof parsed.body !== 'string') return null
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      body: parsed.body,
      tagsText: typeof parsed.tagsText === 'string' ? parsed.tagsText : '',
      category: typeof parsed.category === 'string' ? parsed.category : '',
      format: resolveArticleFormat(parsed.format ?? 'tistory'),
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    }
  } catch {
    return null
  }
}

export function openNewritePreviewTab(
  payload: Omit<NewritePreviewPayload, 'savedAt'>,
): void {
  writeNewritePreview(payload)
  window.open('/newrite/preview', '_blank', 'noopener,noreferrer')
}
