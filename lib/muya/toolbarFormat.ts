import type { Muya } from '@muyajs/core'

import { applyQuickInsert } from '@/lib/muya/applyQuickInsert'
import { insertTextAtMuyaCursor } from '@/lib/muya/insertText'
import { coerceMuyaText, setMuyaBlockText } from '@/lib/muya/muyaPatches'

type ContentBlock = {
  text: string
  parent?: unknown | null
  getCursor: () => { start: { offset: number }; end: { offset: number } } | null
  setCursor: (start: number, end: number, update?: boolean) => void
  update: () => void
  domNode?: HTMLElement
}

/** Prefer Muya cursor; if collapsed, try mapping the browser selection into the active block. */
function resolveOffsets(block: ContentBlock): { start: number; end: number } {
  const current = coerceMuyaText(block.text)
  const cursor = block.getCursor()
  let start = cursor?.start.offset ?? current.length
  let end = cursor?.end.offset ?? start

  if (start !== end) return { start, end }

  const sel = typeof window !== 'undefined' ? window.getSelection() : null
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return { start, end }

  const root = block.domNode
  if (!root || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) {
    return { start, end }
  }

  try {
    const pre = document.createRange()
    pre.selectNodeContents(root)
    pre.setEnd(sel.anchorNode!, sel.anchorOffset)
    const a = pre.toString().length
    pre.setEnd(sel.focusNode!, sel.focusOffset)
    const b = pre.toString().length
    // Muya may hide markdown markers in the DOM; clamp to block text length
    start = Math.max(0, Math.min(current.length, Math.min(a, b)))
    end = Math.max(0, Math.min(current.length, Math.max(a, b)))
  } catch {
    /* keep cursor offsets */
  }

  return { start, end }
}

/** Wrap the current selection (or insert markers around caret) with markdown/HTML. */
export function wrapSelection(
  muya: Muya,
  before: string,
  after: string = before,
  placeholder = '텍스트',
): string {
  const block = muya.editor.activeContentBlock as ContentBlock | null
  if (!block?.parent) {
    return insertTextAtMuyaCursor(muya, `${before}${placeholder}${after}`)
  }

  const current = coerceMuyaText(block.text)
  setMuyaBlockText(block, current)

  const { start, end } = resolveOffsets(block)
  const selected = current.slice(start, end)
  const inner = selected || placeholder
  const wrapped = `${before}${inner}${after}`
  if (!setMuyaBlockText(block, current.slice(0, start) + wrapped + current.slice(end))) {
    return insertTextAtMuyaCursor(muya, `${before}${placeholder}${after}`)
  }

  const nextStart = start + before.length
  const nextEnd = nextStart + inner.length
  try {
    block.setCursor(nextStart, nextEnd, true)
    block.update()
  } catch {
    /* detached */
  }
  return muya.getMarkdown()
}

export function applyToolbarBlock(muya: Muya, label: string): string | null {
  return applyQuickInsert(muya, label)
}

export function insertLink(muya: Muya): string {
  const url = window.prompt('링크 URL', 'https://')
  if (!url) return muya.getMarkdown()
  const href = url.trim()
  if (!href) return muya.getMarkdown()
  return wrapSelection(muya, '[', `](${href})`, '링크')
}

export function insertEmoji(muya: Muya, emoji: string): string {
  return insertTextAtMuyaCursor(muya, emoji)
}

export function wrapAlign(
  muya: Muya,
  align: 'left' | 'center' | 'right' | 'justify',
): string {
  return wrapSelection(
    muya,
    `<p style="text-align:${align}">`,
    '</p>',
    '문단',
  )
}

export function wrapColor(muya: Muya, color: string): string {
  return wrapSelection(muya, `<span style="color:${color}">`, '</span>', '텍스트')
}

export function wrapHighlight(muya: Muya, color: string): string {
  return wrapSelection(
    muya,
    `<span style="background-color:${color}">`,
    '</span>',
    '텍스트',
  )
}
