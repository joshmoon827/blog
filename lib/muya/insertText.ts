import type { Muya } from '@muyajs/core'

import { coerceMuyaText, setMuyaBlockText } from '@/lib/muya/muyaPatches'

/** Insert plain text at the current Muya caret (active content block). */
export function insertTextAtMuyaCursor(muya: Muya, text: string): string {
  const block = muya.editor.activeContentBlock as
    | {
        text: string
        parent?: unknown | null
        getCursor: () => { start: { offset: number }; end: { offset: number } } | null
        setCursor: (start: number, end: number, focus?: boolean) => void
        update: () => void
      }
    | null

  if (block?.parent) {
    const cursor = block.getCursor()
    const current = coerceMuyaText(block.text)
    setMuyaBlockText(block, current)
    const start = cursor?.start.offset ?? current.length
    const end = cursor?.end.offset ?? start
    if (
      !setMuyaBlockText(
        block,
        current.slice(0, start) + text + current.slice(end),
      )
    ) {
      /* fall through to setContent */
    } else {
      const nextPos = start + text.length
      try {
        block.setCursor(nextPos, nextPos, true)
        block.update()
      } catch {
        /* detached mid-edit */
      }
      return muya.getMarkdown()
    }
  }

  const md = muya.getMarkdown()
  const next = md ? `${md}\n${text}` : text
  muya.setContent(next, true)
  return next
}
