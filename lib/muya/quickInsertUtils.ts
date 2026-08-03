import type { Muya } from '@muyajs/core'

import { coerceMuyaText } from '@/lib/muya/muyaPatches'

/** Slash + optional filter (no spaces), same as Muya's quick-insert trigger. */
export const QUICK_INSERT_TEXT_RE = /^[/、]\S*$/

export type ParagraphContentBlock = {
  blockName: string
  text: string
  domNode: HTMLElement
  parent: {
    blockName: string
    text?: string
    meta?: { level?: number }
    replaceWith: (block: unknown) => unknown
    firstContentInDescendant: () => ParagraphContentBlock | null
    getState: () => { text?: string; meta?: { level?: number } }
  }
  setCursor: (start: number, end: number, focus?: boolean) => void
  update: () => void
}

export function isQuickInsertShortcut(event: KeyboardEvent): boolean {
  if (!event.metaKey && !event.ctrlKey) return false
  if (event.altKey) return false
  if (event.code !== 'Slash' && event.code !== 'NumpadDivide') return false
  // Cmd+Shift+/ → "?" on US layouts; not quick-insert.
  if (event.shiftKey) return false
  return true
}

function isFormFieldFocused(): boolean {
  const active = document.activeElement as HTMLElement | null
  if (!active) return false
  const tag = active.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function getParagraphContentBlock(muya: Muya): ParagraphContentBlock | null {
  const active = muya.editor.activeContentBlock as ParagraphContentBlock | null
  if (active?.blockName === 'paragraph.content') {
    active.text = coerceMuyaText(active.text)
    return active
  }

  const selection = muya.editor.selection.getSelection() as
    | {
        anchorBlock?: ParagraphContentBlock
        isSelectionInSameBlock?: boolean
      }
    | undefined

  if (
    selection?.isSelectionInSameBlock &&
    selection.anchorBlock?.blockName === 'paragraph.content'
  ) {
    const block = selection.anchorBlock
    block.text = coerceMuyaText(block.text)
    return block
  }

  return null
}

export function isMuyaEditorFocused(
  muya: Muya,
  host: HTMLElement | null,
): boolean {
  if (isFormFieldFocused()) return false

  const active = document.activeElement
  if (active && host?.contains(active)) return true
  if (active && muya.domNode.contains(active)) return true

  // Inline ⌘E: focus often stays on <body> while the caret is in Muya.
  if (document.body.classList.contains('muya-edit') && getParagraphContentBlock(muya)) {
    return true
  }

  return false
}

export function getQuickInsertFilter(muya: Muya): string | null {
  const block = getParagraphContentBlock(muya)
  if (!block) return null
  const text = coerceMuyaText(block.text)
  if (!QUICK_INSERT_TEXT_RE.test(text)) return null
  return text.length > 1 ? text.substring(1) : ''
}

export function getCaretClientRect(muya: Muya): DOMRect | null {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0).cloneRange()
    range.collapse(true)
    const rects = range.getClientRects()
    if (rects.length > 0) {
      const rect = rects[0]
      if (rect.width > 0 || rect.height > 0) return rect
    }
    const rect = range.getBoundingClientRect()
    if (rect.height > 0) return rect
  }

  const block = getParagraphContentBlock(muya)
  if (block?.domNode) {
    const r = block.domNode.getBoundingClientRect()
    return new DOMRect(r.left, r.top, 2, Math.min(24, Math.max(r.height, 16)))
  }

  const editor = muya.domNode.getBoundingClientRect()
  const top = Math.min(Math.max(editor.top + 8, 72), window.innerHeight - 100)
  return new DOMRect(editor.left + 16, top, 2, 20)
}

export function clearSlashTrigger(muya: Muya): void {
  const block = getParagraphContentBlock(muya)
  if (!block) return
  const text = coerceMuyaText(block.text)
  if (!QUICK_INSERT_TEXT_RE.test(text)) return
  block.text = ''
  block.setCursor(0, 0, true)
  block.update()
}
