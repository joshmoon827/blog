import type { Muya } from '@muyajs/core'

type ContentBlock = {
  isContent?: () => boolean
  text?: string | null
  blockName?: string
  parent?: unknown | null
  /** Internal Muya field — used when block is detached and `.text` setter throws. */
  _text?: string | null
  breadthFirstTraverse?: (fn: (node: ContentBlock) => void) => void
}

/** Coerce null/undefined block text — Muya mC uses `text: r = ""` which does not replace null. */
export function coerceMuyaText(text: string | null | undefined): string {
  return text ?? ''
}

/**
 * Safe write to Muya content `.text`. Detached blocks (parent == null) throw
 * inside Muya's path/editOperation during Cmd+Backspace / block teardown.
 */
export function setMuyaBlockText(
  block: { text: string; parent?: unknown | null; _text?: string | null },
  next: string,
): boolean {
  if (block.parent == null) {
    block._text = next
    return false
  }
  try {
    if (block.text === next) return true
    block.text = next
    return true
  } catch {
    block._text = next
    return false
  }
}

function normalizeContentText(node: ContentBlock) {
  if (!node.isContent?.() || node.text != null) return

  // Detached during Cmd+Backspace / replaceWith — `.text` setter needs parent.path.
  if (node.parent == null) {
    node._text = ''
    return
  }
  try {
    node.text = ''
  } catch {
    node._text = ''
  }
}

/** Walk scroll page and fix null `.text` on content blocks (prevents mC/checkNeedRender crashes). */
export function normalizeMuyaContentText(muya: Muya) {
  const page = muya.editor.scrollPage as ContentBlock | null
  page?.breadthFirstTraverse?.(normalizeContentText)
}

export function applyMuyaPatches(muya: Muya) {
  normalizeMuyaContentText(muya)

  muya.on('json-change', () => {
    normalizeMuyaContentText(muya)
  })

  muya.eventCenter.subscribe('content-change', ({ block }) => {
    normalizeContentText(block as ContentBlock)
  })
}
