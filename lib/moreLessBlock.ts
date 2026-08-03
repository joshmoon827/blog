/**
 * Tistory 접은글 (moreLess) helpers.
 *
 * Editor live DOM (always expanded):
 *   <div data-ke-type="moreLess" data-text-more="…" data-text-less="…">…content…</div>
 *
 * Persisted / published HTML (PreProcess):
 *   <div data-ke-type="moreLess" data-text-more="…" data-text-less="…">
 *     <a class="btn-toggle-moreless">더보기</a>
 *     <div class="moreless-content">…content…</div>
 *   </div>
 *
 * On setContent, strip the toggle chrome back to the editor shape.
 */

export const MORELESS_TYPE = 'moreLess'
export const MORELESS_BTN_CLASS = 'btn-toggle-moreless'
export const MORELESS_CONTENT_CLASS = 'moreless-content'
export const MORELESS_DEFAULT_MORE = '더보기'
export const MORELESS_DEFAULT_LESS = '닫기'

export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export function findMoreLess(
  node: Node | null | undefined,
): HTMLElement | null {
  if (!node || node.nodeType !== 1) {
    const el = (node as Node | null)?.parentElement
    return el
      ? (el.closest(`[data-ke-type="${MORELESS_TYPE}"]`) as HTMLElement | null)
      : null
  }
  const el = node as HTMLElement
  if (el.getAttribute?.('data-ke-type') === MORELESS_TYPE) return el
  return el.closest?.(
    `[data-ke-type="${MORELESS_TYPE}"]`,
  ) as HTMLElement | null
}

/** Editor insert/wrap — live DOM shape (no toggle chrome). */
export function moreLessEditorHtml(
  openText: string,
  closeText: string,
  innerHtml: string,
): string {
  const open = openText.trim() || MORELESS_DEFAULT_MORE
  const close = closeText.trim() || MORELESS_DEFAULT_LESS
  const inner = innerHtml.trim() || '<p><br></p>'
  return `<div data-ke-type="${MORELESS_TYPE}" data-text-more="${escapeAttr(open)}" data-text-less="${escapeAttr(close)}">${inner}</div>`
}

/**
 * Match Tistory post-editor PreProcess:
 * wrap children with hardcoded "더보기" button + .moreless-content.
 * Custom labels live on data-text-*; published JS rewrites the button label.
 */
export function enhanceMoreLessForSave(root: ParentNode): void {
  root.querySelectorAll(`[data-ke-type="${MORELESS_TYPE}"]`).forEach((node) => {
    const el = node as HTMLElement
    if (el.querySelector(`:scope > .${MORELESS_CONTENT_CLASS}`)) return
    const inner = el.innerHTML
    el.innerHTML = `<a class="${MORELESS_BTN_CLASS}">${MORELESS_DEFAULT_MORE}</a><div class="${MORELESS_CONTENT_CLASS}">${inner}</div>`
  })
}

/** Match Tistory BeforeSetContent: unwrap .moreless-content back into the shell. */
export function stripMoreLessForEdit(root: ParentNode): void {
  root.querySelectorAll(`[data-ke-type="${MORELESS_TYPE}"]`).forEach((node) => {
    const el = node as HTMLElement
    const content = el.querySelector(`:scope > .${MORELESS_CONTENT_CLASS}`)
    if (!content) {
      // Drop orphan toggle buttons if present
      el.querySelectorAll(`:scope > .${MORELESS_BTN_CLASS}`).forEach((b) =>
        b.remove(),
      )
      return
    }
    el.innerHTML = content.innerHTML
  })
}

export function readMoreLessLabels(el: HTMLElement): {
  openText: string
  closeText: string
} {
  return {
    openText: el.getAttribute('data-text-more') || MORELESS_DEFAULT_MORE,
    closeText: el.getAttribute('data-text-less') || MORELESS_DEFAULT_LESS,
  }
}
