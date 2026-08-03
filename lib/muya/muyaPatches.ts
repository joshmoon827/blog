import type { Muya } from '@muyajs/core'

type ContentBlock = {
  isContent?: () => boolean
  text?: string | null
  blockName?: string
  breadthFirstTraverse?: (fn: (node: ContentBlock) => void) => void
}

/** Coerce null/undefined block text — Muya mC uses `text: r = ""` which does not replace null. */
export function coerceMuyaText(text: string | null | undefined): string {
  return text ?? ''
}

function normalizeContentText(node: ContentBlock) {
  if (node.isContent?.() && node.text == null) {
    node.text = ''
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
    const content = block as ContentBlock
    if (content?.isContent?.() && content.text == null) {
      content.text = ''
    }
  })
}
