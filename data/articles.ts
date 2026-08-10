import type { VaultNoteMetadata } from './metadata'

export interface Article extends Pick<VaultNoteMetadata, 'tags' | 'related'> {
  slug: string
  title: string
  description: string
  image: string
  /** True for 임시저장 drafts (same card/article presentation). */
  draft?: boolean
  /** True for 보관(archived) articles — hidden from main listings. */
  archived?: boolean
  /** Soft-deleted (trash). Hidden from listings. */
  trashed?: boolean
}
