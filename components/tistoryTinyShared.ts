/**
 * Shared TinyMCE/Tistory editor constants & types.
 * Kept separate from TistoryTinyEditor so consumers (e.g. toolbar) can import
 * without pulling tinymce into the SSR graph (`window is not defined`).
 */

import type { Editor as TinyMCEEditor } from 'tinymce'

/** Tistory editor fonts — loaded via content_css (not @import; more reliable in iframe). */
export const TISTORY_FONT_CSS =
  'https://t1.daumcdn.net/tistory_admin/www/style/font.css'

export type TistoryTinyEditorHandle = {
  focus: () => void
  getEditor: () => TinyMCEEditor | null
  setSpellcheck: (on: boolean) => void
  pickImage: () => void
  insertImage: (url: string, alt?: string) => void
}
