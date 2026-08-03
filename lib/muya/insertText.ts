import type { Muya } from '@muyajs/core'

import { coerceMuyaText } from '@/lib/muya/muyaPatches'

/** Insert plain text at the current Muya caret (active content block). */
export function insertTextAtMuyaCursor(muya: Muya, text: string): string {
  const block = muya.editor.activeContentBlock
  if (block) {
    const cursor = block.getCursor()
    const current = coerceMuyaText(block.text)
    if (block.text !== current) block.text = current
    const start = cursor?.start.offset ?? current.length
    const end = cursor?.end.offset ?? start
    block.text = current.slice(0, start) + text + current.slice(end)
    const nextPos = start + text.length
    block.setCursor(nextPos, nextPos, true)
    block.update()
    return muya.getMarkdown()
  }

  const md = muya.getMarkdown()
  const next = md ? `${md}\n${text}` : text
  muya.setContent(next, true)
  return next
}
